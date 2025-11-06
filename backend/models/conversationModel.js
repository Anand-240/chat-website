import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    pairKey: { type: String, required: true, unique: true },
    lastText: { type: String, default: null },
    lastImage: { type: String, default: null },
    lastAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.pre("validate", function (next) {
  if (this.users && this.users.length === 2) {
    const sorted = this.users.map(String).sort();
    this.pairKey = `${sorted[0]}:${sorted[1]}`;
  }
  next();
});

export default mongoose.model("Conversation", conversationSchema);
