import mongoose from "mongoose";

const connectDatabase = async ({ exitOnFailure = true } = {}) => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from the environment");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (exitOnFailure) {
      process.exit(1);
    }

    throw error;
  }
};

export default connectDatabase;
