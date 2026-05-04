import express from "express";
import { z } from "zod";
import { answerChat, sanitizeChatMessage } from "../services/chatAssistant.js";

const router = express.Router();

const chatSchema = z.object({
  message: z.string().trim().min(1).max(700)
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = chatSchema.parse(req.body);
    const message = sanitizeChatMessage(parsed.message);
    const result = await answerChat(message);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.status = 400;
      error.publicMessage = "Please type a message under 700 characters.";
    }
    next(error);
  }
});

export default router;
