import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer, jwt } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizzahub';

const client = new MongoClient(mongoUri, {
  serverSelectionTimeoutMS: 15000,
  maxPoolSize: 10,
});
const db = client.db();

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
    await client.close();
  } catch (err: any) {
    console.error(`[Auth] Error closing mongo client: ${err.message}`);
  }
};
