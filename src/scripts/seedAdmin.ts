import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { auth } from '../config/auth.js';
import { connectDB, closeDB } from '../config/db.js';

dotenv.config();

export const seedAdmin = async () => {
  try {
    console.log('[Seed] Starting Admin Seeding Script...');
    await connectDB();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pizzahub.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@PizzaHub2026!';
    const adminName = 'PizzaHub Administrator';

    // Remove any incomplete old admin user & account
    const oldUser = await db.collection('users').findOne({ email: adminEmail });
    if (oldUser) {
      await db.collection('account').deleteMany({
        $or: [{ userId: oldUser._id }, { userId: oldUser._id.toString() }, { accountId: oldUser._id.toString() }],
      });
      await db.collection('users').deleteOne({ email: adminEmail });
      console.log('[Seed] Removed previous admin records.');
    }

    // Create user natively via Better Auth so its cryptographic hash matches perfectly
    const created = await auth.api.signUpEmail({
      body: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      },
    });

    console.log('[Seed] Better Auth created user account:', created.user.id);

    // Elevate role to 'admin'
    await db.collection('users').updateOne(
      { email: adminEmail },
      {
        $set: {
          role: 'admin',
          isBlocked: false,
          subscriptionPlan: 'premium',
        },
      }
    );

    console.log('[Seed] User role successfully set to "admin"');
    console.log(`  - Email: ${adminEmail}`);
    console.log(`  - Role: admin`);
    console.log(`  - Password: ${adminPassword}`);

    await closeDB();
  } catch (err: any) {
    console.error('[Seed] Error seeding admin:', err.message || err);
    await closeDB();
  }
};

if (require.main === module) {
  seedAdmin().then(() => process.exit(0));
}
