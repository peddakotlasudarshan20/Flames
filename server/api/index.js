import "dotenv/config";
import app from "../src/app.js";

export default async function handler(req, res) {
  return app(req, res);
}
