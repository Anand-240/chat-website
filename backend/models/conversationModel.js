import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    ],
    pairKey: { type: String, required: true, unique: true },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null }
  },
  { timestamps: true }
);

conversationSchema.pre("validate", function (next) {
  if (!this.pairKey && this.participants.length === 2) {
    const sorted = this.participants.map(String).sort().join("_");
    this.pairKey = sorted;
  }
  next();
});

export default mongoose.model("Conversation", conversationSchema);