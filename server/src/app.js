import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import chatRouter from "./routes/chat.js";
import flamesRouter from "./routes/flames.js";
import { clearResults, deleteResult, listDeletedResults, listResults, restoreResult } from "./services/resultStore.js";

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[\w-]+(-[\w-]+)*\.vercel\.app$/.test(origin);
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "32kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log("api_request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, res) {
      return res.status(429).json({ error: "Too many requests" });
    }
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "flames-api" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "flames-api" });
});

app.get("/api/debug", (_req, res) => {
  res.json({
    mongoUriExists: Boolean(process.env.MONGO_URI)
  });
});

app.delete("/api/history/:id", async (req, res, next) => {
  try {
    const item = await deleteResult(req.params.id);
    if (!item) return res.status(404).json({ message: "Result not found" });
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

app.get(["/results", "/api/results"], async (req, res, next) => {
  try {
    const result = await listResults(req.query);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get(["/deleted-results", "/api/deleted-results"], async (req, res, next) => {
  try {
    const result = await listDeletedResults(req.query);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

app.patch(["/results/:id/restore", "/api/results/:id/restore"], async (req, res, next) => {
  try {
    const item = await restoreResult(req.params.id);
    if (!item) return res.status(404).json({ message: "Deleted result not found" });
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/history", async (_req, res, next) => {
  try {
    const result = await clearResults();
    return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

app.use("/api/chat", chatRouter);
app.use("/api/flames", flamesRouter);

app.use((error, _req, res, _next) => {
  const status = error.status || (error.name === "CastError" ? 400 : 500);
  if (status === 500) {
    console.error("API error", error);
  } else if (status >= 503) {
    console.error("Service dependency error", error.message);
  }
  const message = error.name === "CastError" ? "Invalid input" : error.message;
  res.status(status).json({
    error: error.publicMessage || (status === 500 ? "Service temporarily unavailable. Please try again shortly." : message),
    message: error.publicMessage || (status === 500 ? "Service temporarily unavailable. Please try again shortly." : message)
  });
});

export default app;
