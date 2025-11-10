import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }]
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);