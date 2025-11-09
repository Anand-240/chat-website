import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    pairKey: { type: String, unique: true, index: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export default mongoose.models.Contact || mongoose.model("Contact", contactSchema);