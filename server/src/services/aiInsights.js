import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const fallbackInsights = {
  Friends: "This match has a friendly base: easy conversation, low-pressure comfort, and a strong chance of mutual support. The smartest path is to keep expectations clear and let trust grow through consistency.",
  Love: "This match has romantic momentum and emotional curiosity. The connection can feel exciting when both people balance attraction with patience, direct communication, and steady respect.",
  Affection: "This match leans warm and caring. It may grow through small gestures, shared routines, and a calm style of attention that makes both people feel considered.",
  Marriage: "This match suggests partnership energy. It works best when both people combine affection with reliability, honest planning, and the willingness to solve ordinary problems together.",
  Enemies: "This match has strong contrast, which can create friction or growth. It needs emotional maturity, boundaries, and direct conversations so differences do not turn into assumptions.",
  Siblings: "This match feels familiar and playful. The bond may include teasing, protectiveness, and comfort, but it still benefits from respect and space."
};

const requiredInsightTitles = ["Personality signal", "Communication rhythm", "Compatibility focus"];

function safeJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function toList(value, defaults) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|;|,/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return defaults;
}

function cleanText(value, fallbackText, limit = 900) {
  const text = String(value || fallbackText || "").replace(/\s+/g, " ").trim();
  return text.slice(0, limit);
}

function fallback(result) {
  return {
    relationshipType: result,
    explanation: fallbackInsights[result],
    compatibilityReasoning: fallbackInsights[result],
    strengths: [
      "They can build value by staying honest about expectations.",
      "The match has room to grow when both people show consistent effort."
    ],
    possibleConflicts: [
      "Assumptions may create avoidable tension.",
      "Different communication habits may need patience."
    ],
    advice: "Use this reading as a thoughtful conversation starter, then let real behavior, respect, and communication decide the connection.",
    insights: [
      { title: "Personality signal", detail: "The best signal comes from how each person handles small, repeated moments." },
      { title: "Communication rhythm", detail: "Compatibility improves when expectations are spoken clearly instead of guessed." },
      { title: "Compatibility focus", detail: "Treat FLAMES as the spark and real communication as the substance." }
    ]
  };
}

export async function generateCompatibilityInsights({ name1, name2, result, remainingCount, context = {} }) {
  if (!process.env.GROQ_API_KEY) return fallback(result);

  try {
    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.75,
      maxTokens: 520
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are the smart insights engine of a compatibility analysis system. Use FLAMES as the base category, then generate an intelligent, realistic relationship report using any user-provided context. FLAMES is playful and not scientific. Do not claim certainty, destiny, private facts, diagnosis, or guaranteed outcomes. Be warm, practical, specific, and concise. Return only valid JSON."
      ],
      [
        "human",
        `Names: {name1} and {name2}
FLAMES result: {result}
Remaining unmatched letter count: {remainingCount}
Personality traits: {personalityTraits}
Interests: {interests}
Communication style: {communicationStyle}

Return JSON with this shape:
{{
  "relationshipType": "short label that can match or refine the FLAMES category",
  "explanation": "80-110 words, meaningful compatibility overview",
  "compatibilityReasoning": "2-3 sentences explaining why this pairing works or needs care",
  "strengths": ["3 short strengths"],
  "possibleConflicts": ["2-3 realistic possible conflicts"],
  "advice": "2 practical sentences for communication and growth",
  "insights": [
    {{ "title": "Personality signal", "detail": "one short useful sentence" }},
    {{ "title": "Communication rhythm", "detail": "one short useful sentence" }},
    {{ "title": "Compatibility focus", "detail": "one short useful sentence" }}
  ]
}}`
      ]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const raw = await chain.invoke({
      name1,
      name2,
      result,
      remainingCount,
      personalityTraits: context.personalityTraits || "Not provided",
      interests: context.interests || "Not provided",
      communicationStyle: context.communicationStyle || "Not provided"
    });
    const parsed = safeJson(raw);

    if (!parsed?.explanation || !Array.isArray(parsed?.insights)) return fallback(result);
    const backup = fallback(result);

    return {
      relationshipType: cleanText(parsed.relationshipType, result, 80),
      explanation: cleanText(parsed.explanation, backup.explanation),
      compatibilityReasoning: cleanText(parsed.compatibilityReasoning, backup.compatibilityReasoning),
      strengths: toList(parsed.strengths, backup.strengths),
      possibleConflicts: toList(parsed.possibleConflicts, backup.possibleConflicts),
      advice: cleanText(parsed.advice, backup.advice, 500),
      insights: requiredInsightTitles.map((title, index) => ({
        title,
        detail: cleanText(parsed.insights[index]?.detail, backup.insights[index].detail, 180)
      }))
    };
  } catch {
    return fallback(result);
  }
}
