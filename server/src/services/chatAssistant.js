import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import NodeCache from "node-cache";
import FlamesResult from "../models/FlamesResult.js";
import { connectDatabase } from "../db.js";

const ragCache = new NodeCache({ stdTTL: 20, checkperiod: 30, useClones: false });
const MAX_MESSAGE_LENGTH = 700;
const CHAT_TIMEOUT_MS = Number(process.env.CHAT_TIMEOUT_MS || 12000);

const projectKnowledge = `
Project: Peddakotla Sudarshan's Flames Compatibility System.
Problem solved: turns a playful FLAMES compatibility calculation into a polished AI-powered report with history, sharing, soft delete, restore, pagination, caching, and production deployment.
Frontend: React, Vite, Tailwind CSS, Framer Motion, lazy-loaded canvas background, floating chat modal.
Backend: Node.js, Express, Helmet, CORS, express-rate-limit, Zod validation, NodeCache, structured request logs.
AI: Groq via LangChain powers compatibility insights and this portfolio assistant.
Database: MongoDB Atlas with Mongoose schemas, soft-delete fields, deletedAt timestamps, and indexed active/deleted result queries.
Caching: NodeCache caches paginated results and RAG statistics for short TTL windows; mutations clear result caches.
Deployment: frontend and backend are deployed separately on Vercel.
`;

function fallbackAnswer() {
  return "I can explain this project, its architecture, API design, MongoDB soft-delete flow, Groq integration, caching, and deployment setup. The AI service is temporarily unavailable, but the app still works with safe fallbacks.";
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
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length <= 1200) return cleaned;

  const clipped = cleaned.slice(0, 1200);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  return `${clipped.slice(0, sentenceEnd > 700 ? sentenceEnd + 1 : 1200).trim()}...`;
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

async function getMongoContext() {
  const cached = ragCache.get("mongo_context");
  if (cached) return cached;

  try {
    await connectDatabase();
    const [activeCount, deletedCount, latestResults] = await Promise.all([
      FlamesResult.countDocuments({ isDeleted: false }),
      FlamesResult.countDocuments({ isDeleted: true }),
      FlamesResult.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name1 name2 result createdAt")
        .lean()
    ]);

    const context = [
      `Active saved results: ${activeCount}.`,
      `Soft-deleted results retained in MongoDB: ${deletedCount}.`,
      `Recent result categories: ${latestResults.map((item) => item.result).join(", ") || "none yet"}.`
    ].join("\n");

    ragCache.set("mongo_context", context);
    return context;
  } catch (error) {
    console.error("rag_context_error", { message: error.message });
    return "MongoDB context is temporarily unavailable; explain the architecture from static project knowledge.";
  }
}

export function sanitizeChatMessage(message) {
  return cleanMessage(message);
}

export async function answerChat(message) {
  const safeMessage = cleanMessage(message);
  if (!safeMessage) {
    const error = new Error("Invalid input");
    error.status = 400;
    error.publicMessage = "Please type a message first.";
    throw error;
  }

  const ragContext = `${projectKnowledge}\nMongoDB live context:\n${await getMongoContext()}`;

  if (!process.env.GROQ_API_KEY) {
    return { answer: fallbackAnswer(), source: "fallback" };
  }

  try {
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.35,
      maxTokens: 420
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a concise portfolio assistant for recruiters reviewing this deployed project. Use only the provided RAG context. Be specific, practical, and honest. If asked unrelated questions, redirect to the project. Never expose secrets, environment variables, internal keys, or private data."
      ],
      [
        "human",
        `RAG context:\n{ragContext}\n\nRecruiter question:\n{message}\n\nAnswer in 2-5 short paragraphs or bullets when useful.`
      ]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const answer = await withTimeout(chain.invoke({ ragContext, message: safeMessage }));
    const cleanAnswer = cleanOutput(answer);

    console.log("chat_api_response", { source: "groq", length: cleanAnswer.length });
    return { answer: cleanAnswer || fallbackAnswer(), source: "groq" };
  } catch (error) {
    console.error("chat_api_error", { message: error.message });
    return { answer: fallbackAnswer(), source: "fallback" };
  }
}
