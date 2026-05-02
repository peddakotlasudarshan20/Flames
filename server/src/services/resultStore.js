import FlamesResult from "../models/FlamesResult.js";
import { connectDatabase } from "../db.js";

async function requireDatabase() {
  try {
    await connectDatabase();
  } catch (error) {
    const dbError = new Error("Database is not connected. Configure a valid MongoDB Atlas MONGO_URI.");
    dbError.status = 503;
    dbError.cause = error;
    throw dbError;
  }
}

export async function createResult(data) {
  await requireDatabase();
  return FlamesResult.create(data);
}

export async function listResults() {
  await requireDatabase();
  return FlamesResult.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .select("name1 name2 result relationshipType createdAt")
    .lean();
}

export async function findResult(id) {
  await requireDatabase();
  return FlamesResult.findById(id);
}
