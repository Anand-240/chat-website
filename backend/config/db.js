import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }
  try {
    const conn = await mongoose.connect(uri, { autoIndex: true });
    console.log(`✅ MongoDB Connected: ${conn.connection.name}`);
  } catch (err) {
    console.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};