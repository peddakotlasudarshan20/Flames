import mongoose from "mongoose";

const insightSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    detail: { type: String, required: true }
  },
  { _id: false }
);

const flamesResultSchema = new mongoose.Schema(
  {
    name1: { type: String, required: true, trim: true },
    name2: { type: String, required: true, trim: true },
    result: {
      type: String,
      enum: ["Friends", "Love", "Affection", "Marriage", "Enemies", "Siblings"],
      required: true
    },
    remainingCount: { type: Number, required: true },
    eliminationSteps: [
      {
        before: [String],
        removed: String,
        index: Number
      }
    ],
    explanation: { type: String, required: true },
    insights: [insightSchema]
  },
  { timestamps: true }
);

export default mongoose.model("FlamesResult", flamesResultSchema);
