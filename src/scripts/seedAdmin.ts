import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, closeDB } from '../config/db';
import { User } from '../models/User';
import { closeAuthClient } from '../config/auth';

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('[Seed] Starting Admin Seeding Script...');
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pizzahub.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@PizzaHub2026!';
    const adminName = process.env.ADMIN_NAME || 'PizzaHub Platform Admin';

    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: 'admin' }],
    });

    if (existingAdmin) {
      console.log(`[Seed] Admin user already exists: ${existingAdmin.email} (Role: ${existingAdmin.role})`);
      await closeDB();
      await closeAuthClient();
      process.exit(0);
    }

    // Hash password with bcrypt for account storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create user in users collection
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      emailVerified: true,
      role: 'admin',
      isBlocked: false,
      subscriptionPlan: 'premium',
    });

    // Create corresponding Better Auth account record in 'account' collection
    const db = mongoose.connection.db;
    if (db) {
      await db.collection('account').insertOne({
        userId: adminUser._id.toString(),
        accountId: adminUser._id.toString(),
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`[Seed] Admin account successfully seeded:`);
    console.log(`  - Email: ${adminEmail}`);
    console.log(`  - Role: admin`);
    console.log(`  - Password: ${adminPassword}`);

    await closeDB();
    await closeAuthClient();
    process.exit(0);
  } catch (error: any) {
    console.error(`[Seed] Error seeding admin user: ${error.message}`);
    await closeDB();
    await closeAuthClient();
    process.exit(1);
  }
};

seedAdmin();
