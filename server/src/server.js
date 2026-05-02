import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import flamesRouter from "./routes/flames.js";
import { connectDatabase } from "./db.js";

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
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
  res.json({ ok: true, service: "flames-ai-api" });
});

app.use("/api/flames", flamesRouter);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    message: status === 500 ? "Server error" : error.message
  });
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`FLAMES AI API running on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error.message);
    process.exit(1);
  });

export default app;
