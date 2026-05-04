import express from "express";
import { z } from "zod";
import { generateCompatibilityInsights } from "../services/aiInsights.js";
import { calculateFlames } from "../services/flamesEngine.js";
import { clearResults, createResult, deleteResult, findResult, listDeletedResults, listResults, restoreResult } from "../services/resultStore.js";

const router = express.Router();

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const payloadSchema = z.object({
  name1: z.preprocess(cleanText, z.string().min(1).max(60)),
  name2: z.preprocess(cleanText, z.string().min(1).max(60)),
  personalityTraits: z.preprocess(cleanText, z.string().max(220)).optional().default(""),
  interests: z.preprocess(cleanText, z.string().max(220)).optional().default(""),
  communicationStyle: z.preprocess(cleanText, z.string().max(160)).optional().default("")
});

function serialize(document) {
  const item = document.toObject ? document.toObject() : document;
  const { __v, isDeleted, deletedAt, ...safeItem } = item;
  return {
    ...safeItem,
    shareId: item._id?.toString()
  };
}

router.post("/", async (req, res, next) => {
  try {
    const { name1, name2, personalityTraits, interests, communicationStyle } = payloadSchema.parse(req.body);
    const context = { personalityTraits, interests, communicationStyle };
    const flames = calculateFlames(name1, name2);
    const generatedInsights = await generateCompatibilityInsights({ name1, name2, context, ...flames });

    const saved = await createResult({
      name1,
      name2,
      context,
      ...flames,
      ...generatedInsights
    });

    res.status(201).json(serialize(saved));
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.message = "Invalid input";
      error.publicMessage = "Invalid input";
    }
    next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const result = await listResults(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/deleted-results", async (req, res, next) => {
  try {
    const result = await listDeletedResults(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = await findResult(req.params.id);
    if (!item) return res.status(404).json({ message: "Result not found" });
    return res.json(serialize(item));
  } catch (error) {
    next(error);
  }
});

router.delete("/history/:id", async (req, res, next) => {
  try {
    const item = await deleteResult(req.params.id);
    if (!item) return res.status(404).json({ message: "Result not found" });
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

router.delete("/history", async (_req, res, next) => {
  try {
    const result = await clearResults();
    return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/restore", async (req, res, next) => {
  try {
    const item = await restoreResult(req.params.id);
    if (!item) return res.status(404).json({ message: "Deleted result not found" });
    return res.json({ ok: true, item: serialize(item) });
  } catch (error) {
    next(error);
  }
});

export default router;
