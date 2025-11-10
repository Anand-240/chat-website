import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    profilePic: {
      type: String,
      default: "https://res.cloudinary.com/demo/image/upload/v1699000000/default-avatar.png"
    },

    bio: { type: String, default: "" },
    status: { type: String, enum: ["online", "offline"], default: "offline" },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);