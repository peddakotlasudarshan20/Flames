import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const fallbackInsights = {
  Friends: "This pairing reads as easygoing and supportive. The bond is strongest when both people keep things light, honest, and consistent.",
  Love: "This pairing has warm chemistry and emotional pull. It works best when attraction is matched with patience and clear communication.",
  Affection: "This pairing suggests care, comfort, and gentle attention. The connection can grow beautifully when both people show up in small practical ways.",
  Marriage: "This pairing points toward steady partnership energy. It becomes strongest when both people balance romance with reliability.",
  Enemies: "This pairing has strong contrast. That does not mean failure, but it does mean both people need maturity, boundaries, and honest conversations.",
  Siblings: "This pairing has a familiar, playful dynamic. Expect teasing, protectiveness, and a connection that feels comfortable quickly."
};

const requiredInsightTitles = ["Chemistry", "Strength", "Watch point"];

function safeJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function fallback(result) {
  return {
    explanation: fallbackInsights[result],
    insights: [
      { title: "Emotional tone", detail: "The reading is playful, so treat it as a conversation starter rather than a prediction." },
      { title: "Strength", detail: "The best signal comes from mutual respect, timing, and how both people handle small moments." },
      { title: "Watch point", detail: "Compatibility improves when expectations are spoken clearly instead of guessed." }
    ]
  };
}

export async function generateCompatibilityInsights({ name1, name2, result, remainingCount }) {
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
        "You write concise compatibility readings for a FLAMES app. FLAMES is a playful name-based game, not science. Do not claim certainty, destiny, private facts, psychological diagnosis, or real-world relationship outcomes. Keep it fun, realistic, warm, and useful. Return only valid JSON."
      ],
      [
        "human",
        `Names: {name1} and {name2}
FLAMES result: {result}
Remaining unmatched letter count: {remainingCount}

Return JSON with this shape:
{{
  "explanation": "70-95 words, fun but grounded compatibility explanation",
  "insights": [
    {{ "title": "Chemistry", "detail": "one short useful sentence" }},
    {{ "title": "Strength", "detail": "one short useful sentence" }},
    {{ "title": "Watch point", "detail": "one short useful sentence" }}
  ]
}}`
      ]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const raw = await chain.invoke({ name1, name2, result, remainingCount });
    const parsed = safeJson(raw);

    if (!parsed?.explanation || !Array.isArray(parsed?.insights)) return fallback(result);

    return {
      explanation: String(parsed.explanation).replace(/\s+/g, " ").trim().slice(0, 900),
      insights: requiredInsightTitles.map((title, index) => ({
        title,
        detail: String(parsed.insights[index]?.detail || fallback(result).insights[index].detail)
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180)
      }))
    };
  } catch {
    return fallback(result);
  }
}
