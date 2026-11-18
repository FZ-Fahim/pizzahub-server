import mongoose from 'mongoose';

let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('[Database] Warning: MONGODB_URI environment variable is not defined.');
    return;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    await cachedPromise;
    console.log('[Database] MongoDB connected successfully');
  } catch (error: any) {
    cachedPromise = null;
    console.error(`[Database] MongoDB connection error: ${error.message}`);
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    cachedPromise = null;
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error: any) {
    console.error(`[Database] Error while closing MongoDB connection: ${error.message}`);
  }
};
