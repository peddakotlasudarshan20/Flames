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
    context: {
      personalityTraits: { type: String, trim: true, default: "" },
      interests: { type: String, trim: true, default: "" },
      communicationStyle: { type: String, trim: true, default: "" }
    },
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
    relationshipType: { type: String, required: true },
    explanation: { type: String, required: true },
    compatibilityReasoning: { type: String, required: true },
    strengths: [{ type: String }],
    possibleConflicts: [{ type: String }],
    advice: { type: String, required: true },
    insights: [insightSchema],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

flamesResultSchema.index({ isDeleted: 1 });
flamesResultSchema.index({ isDeleted: 1, createdAt: -1 });

export default mongoose.model("FlamesResult", flamesResultSchema);
