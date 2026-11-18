import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

let retryCount = 0;

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizzahub';

  // Setup connection event listeners
  mongoose.connection.on('connected', () => {
    console.log('[Database] Connected to MongoDB successfully');
    retryCount = 0;
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Database] MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[Database] MongoDB reconnected successfully');
  });

  const attemptConnection = async () => {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
    } catch (error: any) {
      retryCount++;
      console.error(
        `[Database] Initial MongoDB connection failed (Attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`
      );

      if (retryCount < MAX_RETRIES) {
        console.log(`[Database] Retrying connection in ${RETRY_INTERVAL_MS / 1000} seconds...`);
        setTimeout(attemptConnection, RETRY_INTERVAL_MS);
      } else {
        console.error('[Database] Maximum retry attempts reached. MongoDB connection could not be established.');
      }
    }
  };

  await attemptConnection();
};

export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error: any) {
    console.error(`[Database] Error while closing MongoDB connection: ${error.message}`);
  }
};
