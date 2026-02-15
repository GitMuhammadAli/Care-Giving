/**
 * CareCircle Demo Seed Script
 * ============================
 * Creates a fully-populated demo user for production testing.
 * Anyone can log in with demo@carecircle.com / Demo1234! and explore every feature.
 *
 * The demo user has:
 * - A family with one care recipient (Mom — Eleanor)
 * - 2 doctors, 2 emergency contacts
 * - 6 medications with logs (given/missed/skipped history)
 * - 5 appointments (past + upcoming)
 * - 15+ timeline entries across all types (vitals, meals, mood, incidents, etc.)
 * - 3 caregiver shifts
 * - 5 documents (metadata only, no actual files)
 * - 10 notifications
 *
 * SAFE TO RUN MULTIPLE TIMES — uses upsert by email.
 * DOES NOT delete any existing data.
 *
 * Usage:
 *   pnpm --filter @carecircle/database seed:demo
 *   or
 *   npx ts-node prisma/seed-demo.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// CONSTANTS
// ============================================================================

const DEMO_EMAIL = 'demo@carecircle.com';
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_NAME = 'Alex Demo';
const DEMO_PHONE = '+1-555-0199';

// Date helpers
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000);
const daysFromNow = (n: number) => new Date(today.getTime() + n * 86400000);
const setTime = (date: Date, h: number, m: number) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              CareCircle Demo User Seed                       ║');
  console.log('║                                                              ║');
  console.log('║   Email:    demo@carecircle.com                              ║');
  console.log('║   Password: Demo1234!                                        ║');
  console.log('║                                                              ║');
  console.log('║   This user is READ + CREATE only in production.             ║');
  console.log('║   Cannot change email, password, or delete core data.        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Ensure pgvector + ai_embeddings table exist (db:push doesn't create raw SQL tables)
  console.log('🧠  Ensuring AI embeddings table exists...');
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ai_embeddings" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "content" TEXT NOT NULL,
        "embedding" vector(768),
        "resource_type" TEXT NOT NULL,
        "resource_id" TEXT NOT NULL,
        "family_id" TEXT NOT NULL,
        "care_recipient_id" TEXT,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "ai_embeddings_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_embeddings_family" ON "ai_embeddings"("family_id")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_embeddings_care_recipient" ON "ai_embeddings"("care_recipient_id") WHERE "care_recipient_id" IS NOT NULL`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_embeddings_resource" ON "ai_embeddings"("resource_type", "resource_id")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_embeddings_vector" ON "ai_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64)`);
    console.log('   ✅ ai_embeddings table ready');
  } catch (err: any) {
    console.warn('   ⚠️  Could not create ai_embeddings table (pgvector may not be available):', err?.message);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ──────────────────────────────────────────
  // 1. DEMO USER
  // ──────────────────────────────────────────
  console.log('👤  Creating demo user...');
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      fullName: DEMO_NAME,
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true,
      onboardingCompleted: true,
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      fullName: DEMO_NAME,
      phone: DEMO_PHONE,
      timezone: 'America/New_York',
      status: 'ACTIVE',
      systemRole: 'USER',
      emailVerified: true,
      emailVerifiedAt: daysAgo(30),
      onboardingCompleted: true,
      onboardingCompletedAt: daysAgo(30),
      lastLoginAt: daysAgo(1),
    },
  });

  // ──────────────────────────────────────────
  // 2. FAMILY
  // ──────────────────────────────────────────
  console.log('👨‍👩‍👧  Creating family...');
  let family = await prisma.family.findFirst({
    where: { members: { some: { userId: user.id, role: 'ADMIN' } } },
  });
  if (!family) {
    family = await prisma.family.create({
      data: { name: 'Demo Family' },
    });
    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: user.id,
        role: 'ADMIN',
        isActive: true,
        canEdit: true,
        nickname: 'Alex',
      },
    });
  }

  // ──────────────────────────────────────────
  // 3. CARE RECIPIENT
  // ──────────────────────────────────────────
  console.log('🧓  Creating care recipient (Mom — Eleanor)...');
  let careRecipient = await prisma.careRecipient.findFirst({
    where: { familyId: family.id },
  });
  if (!careRecipient) {
    careRecipient = await prisma.careRecipient.create({
      data: {
        familyId: family.id,
        fullName: 'Eleanor Thompson',
        preferredName: 'Mom',
        dateOfBirth: new Date('1948-06-15'),
        bloodType: 'A+',
        allergies: ['Penicillin', 'Sulfa drugs'],
        conditions: ['Hypertension', 'Type 2 Diabetes', 'Mild Arthritis'],
        notes: 'Prefers to be called Mom or Ellie. Loves gardening and crossword puzzles. Hard of hearing in left ear.',
        primaryHospital: 'St. Mary\'s Medical Center',
        hospitalAddress: '1234 Health Ave, Springfield, IL 62701',
        insuranceProvider: 'Medicare + Blue Cross Supplement',
        insurancePolicyNo: 'MCR-8827441-A',
      },
    });
  }

  // ──────────────────────────────────────────
  // 4. DOCTORS
  // ──────────────────────────────────────────
  console.log('🩺  Creating doctors...');
  const existingDoctors = await prisma.doctor.findMany({ where: { careRecipientId: careRecipient.id } });
  if (existingDoctors.length === 0) {
    await prisma.doctor.createMany({
      data: [
        {
          careRecipientId: careRecipient.id,
          name: 'Dr. Sarah Chen',
          specialty: 'Primary Care',
          phone: '+1-555-0201',
          email: 'dr.chen@springfieldmedical.com',
          address: '456 Medical Plaza, Suite 200, Springfield, IL',
          notes: 'Has been Mom\'s doctor for 12 years. Prefers morning appointments.',
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Dr. James Patel',
          specialty: 'Cardiology',
          phone: '+1-555-0202',
          email: 'dr.patel@heartcare.com',
          address: '789 Cardiac Center, Springfield, IL',
          notes: 'Sees Mom quarterly for hypertension management.',
        },
      ],
    });
  }
  const doctors = await prisma.doctor.findMany({ where: { careRecipientId: careRecipient.id } });

  // ──────────────────────────────────────────
  // 5. EMERGENCY CONTACTS
  // ──────────────────────────────────────────
  console.log('🚨  Creating emergency contacts...');
  const existingContacts = await prisma.emergencyContact.findMany({ where: { careRecipientId: careRecipient.id } });
  if (existingContacts.length === 0) {
    await prisma.emergencyContact.createMany({
      data: [
        {
          careRecipientId: careRecipient.id,
          name: 'Michael Thompson',
          relationship: 'Son',
          phone: '+1-555-0301',
          email: 'michael@example.com',
          isPrimary: true,
          notes: 'Lives 10 minutes away. Works from home on Tuesdays and Thursdays.',
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Lisa Rodriguez',
          relationship: 'Neighbor',
          phone: '+1-555-0302',
          isPrimary: false,
          notes: 'Has a spare house key. Available most weekdays.',
        },
      ],
    });
  }

  // ──────────────────────────────────────────
  // 6. MEDICATIONS (6 realistic medications)
  // ──────────────────────────────────────────
  console.log('💊  Creating medications...');
  const existingMeds = await prisma.medication.findMany({ where: { careRecipientId: careRecipient.id } });
  if (existingMeds.length === 0) {
    await prisma.medication.createMany({
      data: [
        {
          careRecipientId: careRecipient.id,
          name: 'Lisinopril',
          genericName: 'Lisinopril',
          dosage: '10mg',
          form: 'TABLET',
          frequency: 'DAILY',
          timesPerDay: 1,
          scheduledTimes: ['08:00'],
          instructions: 'Take with breakfast. Monitor blood pressure.',
          prescribedBy: 'Dr. Sarah Chen',
          pharmacy: 'CVS Pharmacy',
          pharmacyPhone: '+1-555-0401',
          currentSupply: 22,
          refillAt: 7,
          isActive: true,
          startDate: daysAgo(180),
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Metformin',
          genericName: 'Metformin HCl',
          dosage: '500mg',
          form: 'TABLET',
          frequency: 'TWICE_DAILY',
          timesPerDay: 2,
          scheduledTimes: ['08:00', '18:00'],
          instructions: 'Take with food to reduce stomach upset.',
          prescribedBy: 'Dr. Sarah Chen',
          pharmacy: 'CVS Pharmacy',
          pharmacyPhone: '+1-555-0401',
          currentSupply: 45,
          refillAt: 10,
          isActive: true,
          startDate: daysAgo(365),
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Amlodipine',
          genericName: 'Amlodipine Besylate',
          dosage: '5mg',
          form: 'TABLET',
          frequency: 'DAILY',
          timesPerDay: 1,
          scheduledTimes: ['20:00'],
          instructions: 'Take in the evening. May cause ankle swelling.',
          prescribedBy: 'Dr. James Patel',
          pharmacy: 'CVS Pharmacy',
          pharmacyPhone: '+1-555-0401',
          currentSupply: 15,
          refillAt: 7,
          isActive: true,
          startDate: daysAgo(90),
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Aspirin',
          genericName: 'Acetylsalicylic Acid',
          dosage: '81mg',
          form: 'TABLET',
          frequency: 'DAILY',
          timesPerDay: 1,
          scheduledTimes: ['08:00'],
          instructions: 'Baby aspirin. Take with food.',
          currentSupply: 60,
          refillAt: 14,
          isActive: true,
          startDate: daysAgo(365),
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Vitamin D3',
          dosage: '2000 IU',
          form: 'CAPSULE',
          frequency: 'DAILY',
          timesPerDay: 1,
          scheduledTimes: ['08:00'],
          instructions: 'Take with a meal containing fat for better absorption.',
          currentSupply: 30,
          refillAt: 7,
          isActive: true,
          startDate: daysAgo(120),
        },
        {
          careRecipientId: careRecipient.id,
          name: 'Acetaminophen',
          genericName: 'Acetaminophen',
          dosage: '500mg',
          form: 'TABLET',
          frequency: 'AS_NEEDED',
          timesPerDay: 1,
          scheduledTimes: [],
          instructions: 'For arthritis pain. Max 3g/day. Do not mix with alcohol.',
          currentSupply: 40,
          isActive: true,
          startDate: daysAgo(60),
          notes: 'Usually needed in the morning for joint stiffness.',
        },
      ],
    });
  }
  const medications = await prisma.medication.findMany({ where: { careRecipientId: careRecipient.id } });

  // ──────────────────────────────────────────
  // 7. MEDICATION LOGS (7 days of history)
  // ──────────────────────────────────────────
  console.log('📋  Creating medication logs (7 days of history)...');
  const existingLogs = await prisma.medicationLog.count({
    where: { medication: { careRecipientId: careRecipient.id } },
  });
  if (existingLogs === 0) {
    const logData: any[] = [];
    const scheduledMeds = medications.filter(m => m.scheduledTimes.length > 0);

    for (let day = 0; day < 7; day++) {
      const date = daysAgo(day);
      for (const med of scheduledMeds) {
        for (const time of med.scheduledTimes) {
          const [h, m] = time.split(':').map(Number);
          const scheduled = setTime(date, h, m);
          // 85% given, 10% missed, 5% skipped
          const roll = Math.random();
          const status = roll < 0.85 ? 'GIVEN' : roll < 0.95 ? 'MISSED' : 'SKIPPED';
          logData.push({
            medicationId: med.id,
            givenById: user.id,
            scheduledTime: scheduled,
            givenTime: status === 'GIVEN' ? new Date(scheduled.getTime() + Math.random() * 1800000) : null,
            status,
            skipReason: status === 'SKIPPED' ? 'Patient refused' : null,
          });
        }
      }
    }
    await prisma.medicationLog.createMany({ data: logData });
  }

  // ──────────────────────────────────────────
  // 8. APPOINTMENTS
  // ──────────────────────────────────────────
  console.log('📅  Creating appointments...');
  const existingApts = await prisma.appointment.count({ where: { careRecipientId: careRecipient.id } });
  if (existingApts === 0) {
    await prisma.appointment.createMany({
      data: [
        {
          careRecipientId: careRecipient.id,
          doctorId: doctors[0]?.id,
          title: 'Primary Care Checkup',
          type: 'DOCTOR_VISIT',
          startTime: setTime(daysAgo(5), 10, 0),
          endTime: setTime(daysAgo(5), 10, 30),
          location: '456 Medical Plaza, Suite 200',
          status: 'COMPLETED',
          notes: 'Routine checkup. Blood pressure was slightly elevated.',
        },
        {
          careRecipientId: careRecipient.id,
          doctorId: doctors[1]?.id,
          title: 'Cardiology Follow-up',
          type: 'SPECIALIST',
          startTime: setTime(daysAgo(12), 14, 0),
          endTime: setTime(daysAgo(12), 14, 45),
          location: '789 Cardiac Center',
          status: 'COMPLETED',
          notes: 'EKG normal. Continue current medications. Follow up in 3 months.',
        },
        {
          careRecipientId: careRecipient.id,
          title: 'Lab Work — A1C & Lipid Panel',
          type: 'LAB_WORK',
          startTime: setTime(daysFromNow(3), 8, 0),
          endTime: setTime(daysFromNow(3), 8, 30),
          location: 'Quest Diagnostics, 321 Lab Way',
          status: 'SCHEDULED',
          notes: 'Fasting required — no food after midnight.',
        },
        {
          careRecipientId: careRecipient.id,
          title: 'Physical Therapy Session',
          type: 'PHYSICAL_THERAPY',
          startTime: setTime(daysFromNow(5), 11, 0),
          endTime: setTime(daysFromNow(5), 12, 0),
          location: 'Springfield PT Center',
          status: 'SCHEDULED',
          notes: 'Knee and hip mobility exercises. Bring comfortable clothes.',
          isRecurring: true,
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU,TH',
        },
        {
          careRecipientId: careRecipient.id,
          doctorId: doctors[0]?.id,
          title: 'Primary Care — Medication Review',
          type: 'DOCTOR_VISIT',
          startTime: setTime(daysFromNow(14), 9, 30),
          endTime: setTime(daysFromNow(14), 10, 0),
          location: '456 Medical Plaza, Suite 200',
          status: 'SCHEDULED',
          notes: 'Discuss blood pressure management and potential medication adjustment.',
        },
      ],
    });
  }

  // ──────────────────────────────────────────
  // 9. TIMELINE ENTRIES (15+ entries across all types)
  // ──────────────────────────────────────────
  console.log('📝  Creating timeline entries...');
  const existingEntries = await prisma.timelineEntry.count({ where: { careRecipientId: careRecipient.id } });
  if (existingEntries === 0) {
    await prisma.timelineEntry.createMany({
      data: [
        // TODAY
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'VITALS', title: 'Morning vitals',
          description: 'Blood pressure 128/82, heart rate 72, temperature 98.4°F, oxygen 97%.',
          severity: 'LOW',
          vitals: { bloodPressureSystolic: 128, bloodPressureDiastolic: 82, heartRate: 72, temperature: 98.4, oxygenLevel: 97 },
          occurredAt: setTime(today, 7, 30),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'MEAL', title: 'Breakfast — oatmeal and fruit',
          description: 'Had a good appetite. Ate oatmeal with blueberries and a glass of orange juice.',
          severity: 'LOW',
          occurredAt: setTime(today, 8, 15),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'MOOD', title: 'Good mood this morning',
          description: 'Woke up cheerful, chatted about her garden plans. Seems well-rested.',
          severity: 'LOW',
          occurredAt: setTime(today, 9, 0),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'ACTIVITY', title: 'Morning walk',
          description: '15-minute walk around the block with walker. Good pace, no shortness of breath.',
          severity: 'LOW',
          occurredAt: setTime(today, 10, 30),
        },
        // YESTERDAY
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'VITALS', title: 'Evening vitals',
          description: 'Blood pressure 135/88, heart rate 78. Slightly elevated — will monitor.',
          severity: 'MEDIUM',
          vitals: { bloodPressureSystolic: 135, bloodPressureDiastolic: 88, heartRate: 78 },
          occurredAt: setTime(daysAgo(1), 18, 0),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'SYMPTOM', title: 'Knee pain after walk',
          description: 'Complained of right knee stiffness after afternoon walk. Applied ice pack for 15 minutes. Pain subsided.',
          severity: 'MEDIUM',
          occurredAt: setTime(daysAgo(1), 15, 30),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'SLEEP', title: 'Good night\'s sleep',
          description: 'Slept from 10pm to 6:30am. Woke once for bathroom at 3am. No restlessness.',
          severity: 'LOW',
          occurredAt: setTime(daysAgo(1), 22, 0),
        },
        // 2 DAYS AGO
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'INCIDENT', title: 'Near-fall in bathroom',
          description: 'Slipped on wet floor getting out of shower. Grabbed the grab bar in time — no fall, no injury. Added non-slip mat.',
          severity: 'HIGH',
          occurredAt: setTime(daysAgo(2), 7, 45),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'NOTE', title: 'Pharmacy called about refill',
          description: 'CVS called to confirm Lisinopril refill is ready for pickup. Needs to be picked up by Friday.',
          occurredAt: setTime(daysAgo(2), 14, 0),
        },
        // 3 DAYS AGO
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'MEAL', title: 'Lunch — refused to eat much',
          description: 'Only ate half a sandwich and some soup. Said she wasn\'t hungry. Drank a full glass of water.',
          severity: 'MEDIUM',
          occurredAt: setTime(daysAgo(3), 12, 30),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'VITALS', title: 'Morning blood sugar',
          description: 'Fasting blood sugar: 142 mg/dL. Slightly above target range (80-130).',
          severity: 'MEDIUM',
          vitals: { bloodSugar: 142 },
          occurredAt: setTime(daysAgo(3), 7, 0),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'ACTIVITY', title: 'Gardening in backyard',
          description: 'Spent 20 minutes watering plants in the backyard. Sat down twice to rest. Enjoyed it.',
          severity: 'LOW',
          occurredAt: setTime(daysAgo(3), 16, 0),
        },
        // 5 DAYS AGO
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'APPOINTMENT_SUMMARY', title: 'Primary care visit summary',
          description: 'Dr. Chen reviewed medications. Blood pressure slightly elevated at 138/86. Suggested reducing sodium intake. Next visit in 2 weeks to reassess. No medication changes at this time.',
          severity: 'MEDIUM',
          occurredAt: setTime(daysAgo(5), 11, 0),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'MOOD', title: 'Anxious about doctor visit',
          description: 'Was nervous before the doctor appointment. Calmed down after talking to Michael on the phone.',
          severity: 'LOW',
          occurredAt: setTime(daysAgo(5), 8, 30),
        },
        // 7 DAYS AGO
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'MEDICATION_CHANGE', title: 'Amlodipine dosage discussed',
          description: 'Dr. Patel mentioned possibly increasing Amlodipine to 10mg if blood pressure doesn\'t stabilize. Will decide at next visit.',
          severity: 'MEDIUM',
          occurredAt: setTime(daysAgo(7), 15, 0),
        },
        {
          careRecipientId: careRecipient.id, createdById: user.id,
          type: 'BATHROOM', title: 'Frequent bathroom visits',
          description: 'Went to bathroom 6 times today, more than usual. No pain. Monitoring.',
          severity: 'LOW',
          occurredAt: setTime(daysAgo(7), 20, 0),
        },
      ],
    });
  }

  // ──────────────────────────────────────────
  // 10. CAREGIVER SHIFTS
  // ──────────────────────────────────────────
  console.log('🕐  Creating caregiver shifts...');
  const existingShifts = await prisma.caregiverShift.count({ where: { careRecipientId: careRecipient.id } });
  if (existingShifts === 0) {
    await prisma.caregiverShift.createMany({
      data: [
        {
          careRecipientId: careRecipient.id,
          caregiverId: user.id,
          startTime: setTime(daysAgo(1), 8, 0),
          endTime: setTime(daysAgo(1), 16, 0),
          status: 'COMPLETED',
          checkedInAt: setTime(daysAgo(1), 7, 55),
          checkedOutAt: setTime(daysAgo(1), 16, 10),
          notes: 'Morning and afternoon care. All medications given on time.',
        },
        {
          careRecipientId: careRecipient.id,
          caregiverId: user.id,
          startTime: setTime(today, 8, 0),
          endTime: setTime(today, 16, 0),
          status: 'IN_PROGRESS',
          checkedInAt: setTime(today, 8, 5),
          notes: 'Morning shift.',
        },
        {
          careRecipientId: careRecipient.id,
          caregiverId: user.id,
          startTime: setTime(daysFromNow(1), 8, 0),
          endTime: setTime(daysFromNow(1), 16, 0),
          status: 'SCHEDULED',
          notes: 'Morning shift — need to pick up medications from pharmacy.',
        },
      ],
    });
  }

  // ──────────────────────────────────────────
  // 11. DOCUMENTS (metadata only — no files)
  // ──────────────────────────────────────────
  console.log('📄  Creating documents...');
  const existingDocs = await prisma.document.count({ where: { familyId: family.id } });
  if (existingDocs === 0) {
    await prisma.document.createMany({
      data: [
        { familyId: family.id, uploadedById: user.id, name: 'Medicare Card — Eleanor Thompson', type: 'INSURANCE_CARD', status: 'READY', mimeType: 'image/jpeg', sizeBytes: 245000, notes: 'Front and back of Medicare card. Policy: MCR-8827441-A.' },
        { familyId: family.id, uploadedById: user.id, name: 'Lab Results — A1C Panel (Jan 2026)', type: 'LAB_RESULT', status: 'READY', mimeType: 'application/pdf', sizeBytes: 512000, notes: 'A1C: 6.9%, Fasting glucose: 138 mg/dL.' },
        { familyId: family.id, uploadedById: user.id, name: 'Prescription — Lisinopril 10mg', type: 'PRESCRIPTION', status: 'READY', mimeType: 'application/pdf', sizeBytes: 128000, notes: 'Renewed January 2026. 90-day supply.' },
        { familyId: family.id, uploadedById: user.id, name: 'Power of Attorney', type: 'POWER_OF_ATTORNEY', status: 'READY', mimeType: 'application/pdf', sizeBytes: 890000, notes: 'Healthcare POA naming Michael Thompson as agent.' },
        { familyId: family.id, uploadedById: user.id, name: 'Photo ID — Eleanor Thompson', type: 'PHOTO_ID', status: 'READY', mimeType: 'image/jpeg', sizeBytes: 180000 },
      ],
    });
  }

  // ──────────────────────────────────────────
  // 12. NOTIFICATIONS
  // ──────────────────────────────────────────
  console.log('🔔  Creating notifications...');
  const existingNotifs = await prisma.notification.count({ where: { userId: user.id } });
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'MEDICATION_REMINDER', title: 'Medication Due', body: 'Lisinopril 10mg is due at 8:00 AM.', read: true, readAt: setTime(today, 8, 5), createdAt: setTime(today, 7, 45) },
        { userId: user.id, type: 'MEDICATION_REMINDER', title: 'Medication Due', body: 'Metformin 500mg is due at 8:00 AM.', read: true, readAt: setTime(today, 8, 5), createdAt: setTime(today, 7, 45) },
        { userId: user.id, type: 'APPOINTMENT_REMINDER', title: 'Upcoming Appointment', body: 'Lab Work — A1C & Lipid Panel in 3 days at Quest Diagnostics.', read: false, createdAt: setTime(today, 9, 0) },
        { userId: user.id, type: 'MEDICATION_MISSED', title: 'Missed Medication', body: 'Amlodipine 5mg was missed yesterday at 8:00 PM.', read: false, createdAt: setTime(daysAgo(1), 21, 0) },
        { userId: user.id, type: 'REFILL_ALERT', title: 'Refill Needed Soon', body: 'Amlodipine 5mg has 15 tablets remaining (approx. 15 days).', read: false, createdAt: daysAgo(1) },
        { userId: user.id, type: 'SHIFT_REMINDER', title: 'Shift Tomorrow', body: 'You have a morning shift (8 AM - 4 PM) tomorrow.', read: true, readAt: daysAgo(1), createdAt: daysAgo(1) },
        { userId: user.id, type: 'TIMELINE_UPDATE', title: 'Incident Reported', body: 'Near-fall in bathroom was logged 2 days ago.', read: true, readAt: daysAgo(2), createdAt: daysAgo(2) },
        { userId: user.id, type: 'GENERAL', title: 'Welcome to CareCircle!', body: 'Your family "Demo Family" is set up. Start by exploring the dashboard.', read: true, readAt: daysAgo(30), createdAt: daysAgo(30) },
      ],
    });
  }

  console.log('');
  console.log('✅  Demo seed complete!');
  console.log('');
  console.log(`    Email:    ${DEMO_EMAIL}`);
  console.log(`    Password: ${DEMO_PASSWORD}`);
  console.log(`    Family:   Demo Family`);
  console.log(`    Care recipient: Eleanor Thompson (Mom)`);
  console.log(`    Medications: ${medications.length} active`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
