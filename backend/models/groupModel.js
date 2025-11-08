import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastText: { type: String, default: null },
    lastImage: { type: String, default: null },
    lastAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model("Group", groupSchema);