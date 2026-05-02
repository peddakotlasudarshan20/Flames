import crypto from "crypto";
import FlamesResult from "../models/FlamesResult.js";
import { connectDatabase } from "../db.js";

const memoryResults = [];
let mongoUnavailableUntil = 0;

async function hasMongo() {
  if (!process.env.MONGO_URI || Date.now() < mongoUnavailableUntil) return false;

  try {
    await connectDatabase();
    return true;
  } catch {
    mongoUnavailableUntil = Date.now() + 30_000;
    return false;
  }
}

export async function createResult(data) {
  if (await hasMongo()) {
    return FlamesResult.create(data);
  }

  const now = new Date();
  const item = {
    _id: crypto.randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now
  };
  memoryResults.unshift(item);
  memoryResults.splice(50);
  return item;
}

export async function listResults() {
  if (await hasMongo()) {
    return FlamesResult.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("name1 name2 result createdAt")
      .lean();
  }

  return memoryResults.slice(0, 20).map(({ _id, name1, name2, result, createdAt }) => ({
    _id,
    name1,
    name2,
    result,
    createdAt
  }));
}

export async function findResult(id) {
  if (await hasMongo()) {
    return FlamesResult.findById(id);
  }

  return memoryResults.find((item) => item._id === id) || null;
}
