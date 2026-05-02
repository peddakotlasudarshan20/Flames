import FlamesResult from "../models/FlamesResult.js";
import { connectDatabase } from "../db.js";

async function requireDatabase() {
  try {
    await connectDatabase();
  } catch (error) {
    const dbError = new Error("Database not connected");
    dbError.status = 503;
    dbError.cause = error;
    dbError.publicMessage = "Database not connected";
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

export async function deleteResult(id) {
  await requireDatabase();
  return FlamesResult.findByIdAndDelete(id);
}

export async function clearResults() {
  await requireDatabase();
  return FlamesResult.deleteMany({});
}
