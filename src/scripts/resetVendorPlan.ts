import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, closeDB } from '../config/db.js';

dotenv.config();

export const resetVendor = async (email?: string) => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    const targetEmail = email || process.argv[2] || 'vendor@vendormail.com';

    const result = await db.collection('users').updateOne(
      { email: targetEmail },
      {
        $set: { subscriptionPlan: 'free' },
        $unset: { subscriptionExpiresAt: '' },
      }
    );

    console.log(`[Reset] Reset result for ${targetEmail}: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    console.log(`[Reset] ${targetEmail} is now on Free Kitchen Tier ($0 / forever).`);

    await closeDB();
  } catch (err: any) {
    console.error('[Reset Error]:', err.message);
    await closeDB();
  }
};

if (require.main === module) {
  resetVendor().then(() => process.exit(0));
}
