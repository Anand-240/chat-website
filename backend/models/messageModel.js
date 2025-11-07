import mongoose from "mongoose";
const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String },
    imageUrl: { type: String }
  },
  { timestamps: true }
);
export default mongoose.model("Message", messageSchema);
