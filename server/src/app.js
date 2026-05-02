import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import flamesRouter from "./routes/flames.js";
import { clearResults, deleteResult } from "./services/resultStore.js";

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
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false
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

app.delete("/api/history", async (_req, res, next) => {
  try {
    const result = await clearResults();
    return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

app.use("/api/flames", flamesRouter);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status === 500) {
    console.error("API error", error);
  } else if (status >= 503) {
    console.error("Service dependency error", error.message);
  }
  res.status(status).json({
    error: error.publicMessage || (status === 500 ? "Service temporarily unavailable. Please try again shortly." : error.message),
    message: error.publicMessage || (status === 500 ? "Service temporarily unavailable. Please try again shortly." : error.message)
  });
});

export default app;
