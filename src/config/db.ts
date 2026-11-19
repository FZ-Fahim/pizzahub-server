import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = globalThis.mongooseCache;

if (!cached) {
  cached = globalThis.mongooseCache = { conn: null, promise: null };
}

export const connectDB = async (): Promise<void> => {
  // If connection is already established, return immediately
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If a connection attempt is already in progress, await it rather than initiating a duplicate
  if (mongoose.connection.readyState === 2 && cached?.promise) {
    try {
      await cached.promise;
      return;
    } catch {
      // If the pending connection failed, fall through to re-attempt
    }
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 10000,
      minPoolSize: 0,
      maxPoolSize: 10,
    };

    if (!cached) {
      cached = globalThis.mongooseCache = { conn: null, promise: null };
    }

    cached.promise = mongoose.connect(mongoUri, options);
    cached.conn = await cached.promise;
    console.log(`[Database] MongoDB connected: ${cached.conn.connection.host}`);
  } catch (error) {
    if (cached) {
      cached.promise = null;
      cached.conn = null;
    }
    console.error('[Database] Connection error:', error);
    throw error;
  }
};

export const closeDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
    console.log('[Database] MongoDB connection closed gracefully');
  } catch (error: any) {
    console.error(`[Database] Error while closing MongoDB connection: ${error.message}`);
  }
};

export default connectDB;
