/**
 * CareCircle Admin Seed Script
 * Creates or updates the super admin user for the admin dashboard
 *
 * IMPORTANT: Run these commands first:
 *   1. npx prisma generate  (regenerate client with new schema)
 *   2. npx prisma migrate deploy  (apply migrations)
 *   3. npm run seed:admin  (run this script)
 *
 * Environment variables (optional - uses defaults if not set):
 *   ADMIN_EMAIL - Admin email (default: superadmin@carecircle.com)
 *   ADMIN_PASSWORD - Admin password (default: SuperAdmin123!)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🔐 Starting admin seed...\n');

  // Get admin credentials from environment or use defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'superadmin@carecircle.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin123!';

  const passwordHash = await hashPassword(adminPassword);

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    // Update existing admin to SUPER_ADMIN if not already
    // Use type assertion to handle pre-migration state
    const userWithRole = existingAdmin as any;
    if (userWithRole.systemRole !== 'SUPER_ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          systemRole: 'SUPER_ADMIN',
          passwordHash, // Update password too
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        } as any,
      });
      console.log(`   ✅ Updated existing user to SUPER_ADMIN: ${adminEmail}`);
    } else {
      // Just update the password
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          passwordHash,
        },
      });
      console.log(`   ✅ Updated password for existing SUPER_ADMIN: ${adminEmail}`);
    }
  } else {
    // Create new super admin user
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'System Administrator',
        status: 'ACTIVE',
        systemRole: 'SUPER_ADMIN',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        preferences: {
          notifications: { email: true, push: true, sms: false },
          theme: 'dark',
        },
      } as any,
    });
    console.log(`   ✅ Created SUPER_ADMIN user: ${adminEmail}`);
  }

  // Also create an ADMIN user for testing
  const regularAdminEmail = 'admin@carecircle.com';
  const existingRegularAdmin = await prisma.user.findUnique({
    where: { email: regularAdminEmail },
  });

  if (existingRegularAdmin) {
    // Update existing user to ADMIN role
    const userWithRole = existingRegularAdmin as any;
    if (userWithRole.systemRole === 'USER' || !userWithRole.systemRole) {
      await prisma.user.update({
        where: { id: existingRegularAdmin.id },
        data: { systemRole: 'ADMIN' } as any,
      });
      console.log(`   ✅ Updated existing user to ADMIN: ${regularAdminEmail}`);
    } else {
      console.log(`   ℹ️  User already has role ${userWithRole.systemRole}: ${regularAdminEmail}`);
    }
  }

  // Create a MODERATOR user for testing
  const moderatorEmail = 'moderator@carecircle.com';
  const existingModerator = await prisma.user.findUnique({
    where: { email: moderatorEmail },
  });

  if (!existingModerator) {
    const moderatorHash = await hashPassword('Moderator123!');
    await prisma.user.create({
      data: {
        email: moderatorEmail,
        passwordHash: moderatorHash,
        fullName: 'Content Moderator',
        status: 'ACTIVE',
        systemRole: 'MODERATOR',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      } as any,
    });
    console.log(`   ✅ Created MODERATOR user: ${moderatorEmail}`);
  }

  console.log('\n🎉 Admin seed completed!\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    🔐 ADMIN DASHBOARD CREDENTIALS                         ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  SUPER ADMIN                                                              ║');
  console.log(`║  Email:    ${adminEmail.padEnd(40)}             ║`);
  console.log(`║  Password: ${adminPassword.padEnd(40)}             ║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  ADMIN (test user)                                                        ║');
  console.log('║  Email:    admin@carecircle.com                                           ║');
  console.log('║  Password: Test1234!                                                      ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  MODERATOR (test user)                                                    ║');
  console.log('║  Email:    moderator@carecircle.com                                       ║');
  console.log('║  Password: Moderator123!                                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('Access admin dashboard at: /admin');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Admin seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
