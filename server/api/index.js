import "dotenv/config";
import app from "../src/app.js";
import { connectDatabase } from "../src/db.js";

export default async function handler(req, res) {
  await connectDatabase();
  return app(req, res);
}
