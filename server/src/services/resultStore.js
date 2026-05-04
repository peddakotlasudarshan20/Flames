import FlamesResult from "../models/FlamesResult.js";
import { connectDatabase } from "../db.js";
import NodeCache from "node-cache";
import mongoose from "mongoose";

const resultsCache = new NodeCache({ stdTTL: 15, checkperiod: 30, useClones: false });
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

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

function invalidInput() {
  const error = new Error("Invalid input");
  error.status = 400;
  error.publicMessage = "Invalid input";
  return error;
}

function parsePositiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  if (Array.isArray(value) || !/^\d+$/.test(String(value))) throw invalidInput();

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw invalidInput();
  if (max && parsed > max) throw invalidInput();

  return parsed;
}

function assertObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw invalidInput();
}

function clearResultsCache() {
  resultsCache.flushAll();
}

export async function createResult(data) {
  await requireDatabase();
  const result = await FlamesResult.create(data);
  clearResultsCache();
  return result;
}

function getPaginationOptions(query = {}) {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function paginatedResponse({ data, total, page, limit }) {
  return {
    data,
    items: data,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function listResults(query = {}) {
  await requireDatabase();
  const { page, limit, skip } = getPaginationOptions(query);
  const cacheKey = `results_page_${page}_limit_${limit}`;
  const cached = resultsCache.get(cacheKey);
  if (cached) return cached;

  const filter = { isDeleted: false };
  const [data, total] = await Promise.all([
    FlamesResult.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select("name1 name2 result createdAt")
      .lean(),
    FlamesResult.countDocuments(filter)
  ]);

  const response = paginatedResponse({ data, total, page, limit });
  resultsCache.set(cacheKey, response);
  return response;
}

export async function listDeletedResults(query = {}) {
  await requireDatabase();
  const { page, limit, skip } = getPaginationOptions(query);
  const cacheKey = `deleted_results_page_${page}_limit_${limit}`;
  const cached = resultsCache.get(cacheKey);
  if (cached) return cached;

  const filter = { isDeleted: true };
  const [data, total] = await Promise.all([
    FlamesResult.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select("name1 name2 result createdAt deletedAt")
      .lean(),
    FlamesResult.countDocuments(filter)
  ]);

  const response = paginatedResponse({ data, total, page, limit });
  resultsCache.set(cacheKey, response);
  return response;
}

export async function findResult(id) {
  await requireDatabase();
  assertObjectId(id);
  return FlamesResult.findOne({ _id: id, isDeleted: false }).lean();
}

export async function deleteResult(id) {
  await requireDatabase();
  assertObjectId(id);
  const result = await FlamesResult.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  ).lean();
  if (result) clearResultsCache();
  return result;
}

export async function restoreResult(id) {
  await requireDatabase();
  assertObjectId(id);
  const result = await FlamesResult.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true }
  ).lean();
  if (result) clearResultsCache();
  return result;
}

export async function clearResults() {
  await requireDatabase();
  const result = await FlamesResult.updateMany({ isDeleted: false }, { isDeleted: true, deletedAt: new Date() });
  if (result.modifiedCount) clearResultsCache();
  return { deletedCount: result.modifiedCount || 0 };
}
