import { ChatGroq } from "@langchain/groq";
import NodeCache from "node-cache";
import FlamesResult from "../models/FlamesResult.js";
import { connectDatabase } from "../db.js";

const ragCache = new NodeCache({ stdTTL: 20, checkperiod: 30, useClones: false });
const MAX_MESSAGE_LENGTH = 700;
const CHAT_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS || 12000);

let chatRequestCount = 0;

const portfolioSections = [
  {
    id: "skills",
    title: "Skills",
    keywords: ["skill", "skills", "tech", "technology", "stack", "language", "frontend", "backend", "ai", "database", "db"],
    content:
      "Skills: React, Vite, Tailwind CSS, Framer Motion, Node.js, Express, MongoDB, Mongoose, Groq, LangChain, REST APIs, input validation, caching, pagination, soft delete, deployment, and production-oriented full-stack architecture."
  },
  {
    id: "projects",
    title: "Projects",
    keywords: ["project", "projects", "build", "built", "app", "application", "flames", "rag", "chatbot", "portfolio"],
    content:
      "Project: Flames AI Compatibility System. It turns the FLAMES compatibility game into a full-stack AI product with Groq-generated relationship insights, MongoDB history, soft delete and restore, paginated APIs, NodeCache performance caching, request validation, rate limiting, and a floating RAG portfolio assistant."
  },
  {
    id: "experience",
    title: "Experience",
    keywords: ["experience", "intern", "internship", "work", "role", "professional", "job"],
    content:
      "Experience: This portfolio demonstrates production-style engineering through a deployed full-stack system: API design, MongoDB modeling, AI integration with Groq, short-lived caching, frontend performance optimization, user-focused error handling, and Vercel deployment."
  },
  {
    id: "education",
    title: "Education",
    keywords: ["education", "college", "degree", "study", "student", "academic"],
    content:
      "Education: The current project data does not include verified degree, college, or academic timeline details."
  },
  {
    id: "links",
    title: "Links",
    keywords: ["contact", "github", "linkedin", "link", "links", "email", "deploy", "deployment", "live"],
    content:
      "Links: GitHub repository: https://github.com/peddakotlasudarshan20/Flames. Frontend deployment: https://client-chi-ashen-67.vercel.app. Backend deployment: https://server-lilac-xi.vercel.app. LinkedIn and email are not available in the current project data."
  },
  {
    id: "about",
    title: "About",
    keywords: ["about", "summary", "profile", "who", "overview", "architecture", "how", "explain"],
    content:
      "About: This is a recruiter-facing AI portfolio project by Peddakotla Sudarshan. It combines a polished React interface, Express APIs, Groq LLM responses, MongoDB persistence, retrieval-aware assistant behavior, caching, validation, logging, and Vercel deployment."
  }
];

const intentFallback = {
  skills: "skills",
  projects: "projects",
  experience: "experience",
  education: "education",
  contact: "links",
  links: "links",
  about: "about"
};

function fallbackAnswer(intent = "about") {
  const section = portfolioSections.find((item) => item.id === intentFallback[intent] || item.id === intent) || portfolioSections.at(-1);
  return section.content;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9\s.:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMessage(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function cleanOutput(value) {
  const cleaned = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\b(as an ai model|as an ai|i am an ai)\b/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length <= 900) return cleaned;

  const clipped = cleaned.slice(0, 900);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  return `${clipped.slice(0, sentenceEnd > 520 ? sentenceEnd + 1 : 900).trim()}...`;
}

function detectIntent(message) {
  const normalized = normalizeText(message);
  const mapping = [
    { intent: "skills", section: "skills", keywords: ["skill", "tech", "technology", "language", "stack", "frontend", "backend"] },
    { intent: "projects", section: "projects", keywords: ["project", "build", "built", "app", "application", "rag", "chatbot"] },
    { intent: "experience", section: "experience", keywords: ["experience", "intern", "internship", "work", "role"] },
    { intent: "education", section: "education", keywords: ["education", "college", "degree", "study"] },
    { intent: "contact", section: "links", keywords: ["contact", "github", "linkedin", "email", "link", "deploy", "live"] }
  ];

  for (const item of mapping) {
    if (item.keywords.some((keyword) => normalized.includes(keyword))) return item;
  }

  return { intent: "about", section: "about", keywords: [] };
}

function scoreSection(section, normalizedQuery) {
  const queryTerms = new Set(normalizedQuery.split(/\s+/).filter((term) => term.length > 2));
  const content = normalizeText(`${section.title} ${section.keywords.join(" ")} ${section.content}`);
  let score = 0;

  for (const keyword of section.keywords) {
    if (normalizedQuery.includes(keyword)) score += 5;
  }

  for (const term of queryTerms) {
    if (content.includes(term)) score += 1;
  }

  return score;
}

function retrievePortfolioSection(message) {
  const normalized = normalizeText(message);
  const detected = detectIntent(message);
  const preferredSection = portfolioSections.find((section) => section.id === detected.section);
  const ranked = portfolioSections
    .map((section) => ({ section, score: scoreSection(section, normalized) + (section.id === detected.section ? 8 : 0) }))
    .sort((a, b) => b.score - a.score);

  return {
    intent: detected.intent,
    section: ranked[0]?.score > 0 ? ranked[0].section : preferredSection,
    score: ranked[0]?.score || 0
  };
}

async function withTimeout(promise) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("AI request timed out");
      error.status = 504;
      reject(error);
    }, CHAT_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getProjectMetricsContext(sectionId) {
  if (sectionId !== "projects" && sectionId !== "about") return "";

  const cached = ragCache.get("project_metrics");
  if (cached) return cached;

  try {
    await connectDatabase();
    const [activeCount, deletedCount, latestResults] = await Promise.all([
      FlamesResult.countDocuments({ isDeleted: false }),
      FlamesResult.countDocuments({ isDeleted: true }),
      FlamesResult.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(3).select("result createdAt").lean()
    ]);

    const context = [
      `Live MongoDB metrics: ${activeCount} active saved results and ${deletedCount} soft-deleted retained results.`,
      `Recent result categories: ${latestResults.map((item) => item.result).join(", ") || "none yet"}.`
    ].join("\n");

    ragCache.set("project_metrics", context);
    return context;
  } catch (error) {
    console.error("rag_metrics_error", { message: error.message });
    return "";
  }
}

function buildPrompt({ context, message }) {
  return `
You are a professional portfolio assistant.

Answer ONLY using this context:
${context}

Rules:
* Be concise
* Be professional
* Use a direct human tone
* Do not use generic AI phrases
* Do not hallucinate
* If not found: say "I don't have that information."

User: ${message}
`;
}

export function sanitizeChatMessage(message) {
  return cleanMessage(message);
}

export async function answerChat(message) {
  const start = Date.now();
  chatRequestCount += 1;

  const safeMessage = cleanMessage(message);
  if (!safeMessage) {
    const error = new Error("Invalid input");
    error.status = 400;
    error.publicMessage = "Please type a message first.";
    throw error;
  }

  const retrieval = retrievePortfolioSection(safeMessage);
  const metricsContext = await getProjectMetricsContext(retrieval.section.id);
  const context = [`Section: ${retrieval.section.title}`, retrieval.section.content, metricsContext].filter(Boolean).join("\n");

  if (!process.env.GROQ_API_KEY) {
    const responseTime = Date.now() - start;
    console.log("chat_metrics", {
      requestCount: chatRequestCount,
      responseTime,
      intent: retrieval.intent,
      section: retrieval.section.id,
      source: "fallback"
    });
    const reply = fallbackAnswer(retrieval.intent);
    return { reply, answer: reply, responseTime, intent: retrieval.intent, section: retrieval.section.id, source: "fallback" };
  }

  try {
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.25,
      maxTokens: 320
    });

    const raw = await withTimeout(model.invoke(buildPrompt({ context, message: safeMessage })));
    const parsed = Array.isArray(raw.content) ? raw.content.map((item) => item.text || "").join(" ") : raw.content;
    const reply = cleanOutput(parsed) || "I don't have that information.";
    const responseTime = Date.now() - start;

    console.log("chat_metrics", {
      requestCount: chatRequestCount,
      responseTime,
      intent: retrieval.intent,
      section: retrieval.section.id,
      source: "groq"
    });

    return { reply, answer: reply, responseTime, intent: retrieval.intent, section: retrieval.section.id, source: "groq" };
  } catch (error) {
    const responseTime = Date.now() - start;
    console.error("chat_api_error", {
      requestCount: chatRequestCount,
      responseTime,
      intent: retrieval.intent,
      section: retrieval.section.id,
      message: error.message
    });
    const reply = fallbackAnswer(retrieval.intent);
    return { reply, answer: reply, responseTime, intent: retrieval.intent, section: retrieval.section.id, source: "fallback" };
  }
}
