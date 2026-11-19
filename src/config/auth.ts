import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer, jwt } from 'better-auth/plugins';
import { MongoClient, MongoClientOptions, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizzahub';

const mongoClientOptions: MongoClientOptions = {
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 0,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

/**
 * Checks if the existing MongoClient instance is still alive and has an open topology.
 */
function isClientHealthy(client: MongoClient | undefined): boolean {
  if (!client) return false;
  try {
    const clientAny = client as any;
    if (clientAny.s?.hasBeenClosed) {
      return false;
    }
    const topology = clientAny.topology;
    if (!topology) {
      // Client created but connect() not yet called
      return true;
    }
    if (typeof topology.isDestroyed === 'function' && topology.isDestroyed()) {
      return false;
    }
    if (topology.s?.state === 'closed' || topology.s?.state === 'closing') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the globally cached MongoClient or initializes a fresh one if the cached
 * client's topology has closed or is not connected.
 */
export function getMongoClient(): MongoClient {
  if (!globalThis._mongoClient || !isClientHealthy(globalThis._mongoClient)) {
    if (globalThis._mongoClient) {
      try {
        globalThis._mongoClient.close().catch(() => {});
      } catch {
        // Ignore errors when closing dead client
      }
    }
    globalThis._mongoClient = new MongoClient(mongoUri, mongoClientOptions);
  }
  return globalThis._mongoClient;
}

/**
 * Safely ensures the MongoDB client connection is established and healthy.
 */
export async function ensureAuthConnected(): Promise<MongoClient> {
  const client = getMongoClient();
  const topology = (client as any).topology;
  try {
    if (!topology || !topology.isConnected()) {
      await client.connect();
    }
    return client;
  } catch (err) {
    console.warn('[Auth] MongoClient connection error or dead topology detected, reinitializing...', err);
    try {
      await client.close();
    } catch {
      // Ignore errors when closing
    }
    globalThis._mongoClient = undefined;
    const freshClient = getMongoClient();
    await freshClient.connect();
    return freshClient;
  }
}

// Proxied Db instance dynamically routes calls to the active, healthy MongoClient
const db = new Proxy({} as Db, {
  get(_target, prop) {
    const activeDb = getMongoClient().db() as any;
    const value = activeDb[prop];
    return typeof value === 'function' ? value.bind(activeDb) : value;
  },
});

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET || 'pizzahub_super_secret_auth_key_min_32_chars_long',
  baseURL: process.env.BETTER_AUTH_URL || "https://pizzahub-server-one.vercel.app",
  trustedOrigins: [
    "https://pizzahub-client-chi.vercel.app",
    "http://localhost:3000",
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
  ],
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    modelName: 'users',
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'customer',
        input: true,
      },
      isBlocked: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
      businessName: {
        type: 'string',
        required: false,
        input: true,
      },
      subscriptionPlan: {
        type: 'string',
        required: false,
        defaultValue: 'free',
        input: false,
      },
      subscriptionExpiresAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  plugins: [bearer(), jwt()],
});

export const closeAuthClient = async () => {
  try {
    if (globalThis._mongoClient) {
      await globalThis._mongoClient.close();
      globalThis._mongoClient = undefined;
    }
  } catch (err: any) {
    console.error(`[Auth] Error closing mongo client: ${err.message}`);
  }
};
