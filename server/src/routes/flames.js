import express from "express";
import { z } from "zod";
import { generateCompatibilityInsights } from "../services/aiInsights.js";
import { calculateFlames } from "../services/flamesEngine.js";
import { createResult, findResult, listResults } from "../services/resultStore.js";

const router = express.Router();

const payloadSchema = z.object({
  name1: z.string().trim().min(1).max(60),
  name2: z.string().trim().min(1).max(60)
});

function serialize(document) {
  const item = document.toObject ? document.toObject() : document;
  return {
    ...item,
    shareId: item._id?.toString()
  };
}

router.post("/", async (req, res, next) => {
  try {
    const { name1, name2 } = payloadSchema.parse(req.body);
    const flames = calculateFlames(name1, name2);
    const ai = await generateCompatibilityInsights({ name1, name2, ...flames });

    const saved = await createResult({
      name1,
      name2,
      ...flames,
      ...ai
    });

    res.status(201).json(serialize(saved));
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.message = "Please enter two valid names.";
    }
    next(error);
  }
});

router.get("/history", async (_req, res, next) => {
  try {
    const items = await listResults();
    res.json({ items });
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

export default router;
