import mongoose from "mongoose";

let connectionPromise;

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  mongoose.set("strictQuery", true);
  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || undefined,
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 2500)
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}
