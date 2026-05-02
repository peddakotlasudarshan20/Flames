import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
const mongooseMajorVersion = Number(mongoose.version.split(".")[0]);
const legacyParserOptions =
  mongooseMajorVersion < 6
    ? {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    : {};

globalThis._mongo = globalThis._mongo || { conn: null, promise: null };

export async function connectDatabase() {
  console.log("Mongo URI status:", process.env.MONGO_URI ? "FOUND" : "MISSING");

  if (!MONGO_URI) {
    throw new Error("Database not connected");
  }

  if (globalThis._mongo.conn) return globalThis._mongo.conn;

  if (!globalThis._mongo.promise) {
    mongoose.set("strictQuery", true);
    globalThis._mongo.promise = mongoose.connect(MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || undefined,
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 10000),
      ...legacyParserOptions
    });
  }

  try {
    globalThis._mongo.conn = await globalThis._mongo.promise;
    return globalThis._mongo.conn;
  } catch (error) {
    globalThis._mongo.promise = null;
    console.error("MongoDB connection failed:", error.message);
    throw new Error("Database not connected");
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
