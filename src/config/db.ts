import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.error('[Database] Connection error:', error);
    throw error;
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error: any) {
    console.error(`[Database] Error while closing MongoDB connection: ${error.message}`);
  }
};

export default connectDB;
