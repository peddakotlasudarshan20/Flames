import mongoose from "mongoose";

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || undefined
  });
}
