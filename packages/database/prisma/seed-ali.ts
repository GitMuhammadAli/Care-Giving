/**
 * Seed script for user ali123@example.com (472b54a2-aa27-44bb-9309-a7fda666120a)
 * 
 * Creates comprehensive test data across ALL features:
 * - Family + Care Recipient (Grandma Fatima)
 * - Doctors, Emergency Contacts
 * - Medications with daily logs (past 14 days)
 * - Appointments (past, today, future)
 * - Caregiver Shifts
 * - Timeline Entries (vitals, notes, incidents, moods, meals, sleep, activities)
 * - Documents
 * - Notifications
 *
 * NON-DESTRUCTIVE: Only deletes data tied to this user's families, then re-creates.
 *
 * Usage: npx ts-node prisma/seed-ali.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_ID = '472b54a2-aa27-44bb-9309-a7fda666120a';

// ============================================================================
// HELPERS
// ============================================================================

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function today(hours: number, minutes = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dayAt(daysOffset: number, hours: number, minutes = 0): Date {
  const d = daysOffset >= 0 ? daysFromNow(daysOffset) : daysAgo(Math.abs(daysOffset));
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌱 Seeding data for ali123@example.com...\n');

  // 1. Verify user exists
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) {
    console.error('❌ User not found. Please register ali123@example.com first.');
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.fullName} (${user.email})`);

  // Ensure onboarding is complete
  await prisma.user.update({
    where: { id: USER_ID },
    data: { onboardingCompleted: true, onboardingCompletedAt: new Date(), status: 'ACTIVE', emailVerified: true },
  });

  // 2. Clean existing data for this user's families
  const existingMemberships = await prisma.familyMember.findMany({
    where: { userId: USER_ID },
    select: { familyId: true },
  });
  const familyIds = existingMemberships.map((m) => m.familyId);

  if (familyIds.length > 0) {
    console.log(`🧹 Cleaning existing data for ${familyIds.length} family(ies)...`);
    // Delete in dependency order
    for (const fid of familyIds) {
      const crs = await prisma.careRecipient.findMany({ where: { familyId: fid }, select: { id: true } });
      const crIds = crs.map((c) => c.id);
      if (crIds.length > 0) {
        await prisma.emergencyAlert.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.medicationLog.deleteMany({ where: { medication: { careRecipientId: { in: crIds } } } });
        await prisma.medication.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.transportAssignment.deleteMany({ where: { appointment: { careRecipientId: { in: crIds } } } });
        await prisma.appointment.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.caregiverShift.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.timelineEntry.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.doctor.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.emergencyContact.deleteMany({ where: { careRecipientId: { in: crIds } } });
        await prisma.careRecipient.deleteMany({ where: { familyId: fid } });
      }
      await prisma.document.deleteMany({ where: { familyId: fid } });
      await prisma.familyInvitation.deleteMany({ where: { familyId: fid } });
      await prisma.familyMember.deleteMany({ where: { familyId: fid } });
      await prisma.family.delete({ where: { id: fid } });
    }
    // Clean AI embeddings
    await prisma.$executeRawUnsafe(
      `DELETE FROM ai_embeddings WHERE family_id IN (${familyIds.map((_, i) => `$${i + 1}`).join(',')})`,
      ...familyIds,
    ).catch(() => {});
  }
  await prisma.notification.deleteMany({ where: { userId: USER_ID } });

  // ============================================
  // 3. CREATE FAMILY
  // ============================================
  console.log('👨‍👩‍👧 Creating family...');
  const family = await prisma.family.create({
    data: {
      name: "Ali's Care Circle",
      members: {
        create: {
          userId: USER_ID,
          role: 'ADMIN',
          nickname: 'Ali',
        },
      },
    },
  });

  // ============================================
  // 4. CREATE CARE RECIPIENT
  // ============================================
  console.log('🏥 Creating care recipient...');
  const careRecipient = await prisma.careRecipient.create({
    data: {
      familyId: family.id,
      fullName: 'Fatima Begum',
      preferredName: 'Grandma',
      dateOfBirth: new Date('1948-03-15'),
      bloodType: 'A+',
      allergies: ['Penicillin', 'Shellfish', 'Latex'],
      conditions: ['Type 2 Diabetes', 'Hypertension', 'Osteoarthritis', 'Mild Cognitive Impairment'],
      notes: 'Prefers to be called Grandma. Speaks Urdu and English. Needs assistance with daily activities. Enjoys gardening and watching nature documentaries.',
      primaryHospital: 'City General Hospital',
      hospitalAddress: '123 Medical Center Blvd, Suite 400',
      insuranceProvider: 'Medicare Advantage - BlueCross',
      insurancePolicyNo: 'MCR-2024-887341',
    },
  });
  const CR_ID = careRecipient.id;

  // ============================================
  // 5. CREATE DOCTORS
  // ============================================
  console.log('👨‍⚕️ Creating doctors...');
  const drKhan = await prisma.doctor.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Dr. Ayesha Khan',
      specialty: 'Internal Medicine (Primary Care)',
      phone: '(555) 123-4567',
      email: 'dr.khan@citygeneralmed.com',
      address: '200 Health Plaza, Suite 301',
      notes: 'Primary care physician since 2019. Prefers morning appointments.',
    },
  });
  const drPatel = await prisma.doctor.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Dr. Raj Patel',
      specialty: 'Endocrinology',
      phone: '(555) 234-5678',
      email: 'rpatel@diabetescare.com',
      address: '450 Specialist Center, Floor 2',
      notes: 'Manages diabetes. Quarterly A1C checks.',
    },
  });
  const drLee = await prisma.doctor.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Dr. Sarah Lee',
      specialty: 'Cardiology',
      phone: '(555) 345-6789',
      address: '100 Heart Health Ave',
      notes: 'BP management. Annual echocardiogram.',
    },
  });
  const drWilson = await prisma.doctor.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Dr. Michael Wilson',
      specialty: 'Orthopedics',
      phone: '(555) 456-7890',
      address: '300 Bone & Joint Clinic',
      notes: 'Knee pain management. Cortisone injections every 3 months.',
    },
  });
  const drNguyen = await prisma.doctor.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Dr. Lisa Nguyen',
      specialty: 'Neurology',
      phone: '(555) 567-8901',
      address: '500 Brain Health Institute',
      notes: 'Cognitive assessments. Monitors mild cognitive impairment.',
    },
  });

  // ============================================
  // 6. EMERGENCY CONTACTS
  // ============================================
  console.log('🆘 Creating emergency contacts...');
  await prisma.emergencyContact.createMany({
    data: [
      {
        careRecipientId: CR_ID,
        name: 'Ali Ahmed',
        relationship: 'Grandson (Primary Caregiver)',
        phone: '(555) 111-2222',
        email: 'ali123@example.com',
        isPrimary: true,
        notes: 'Available 24/7. Lives with Grandma.',
      },
      {
        careRecipientId: CR_ID,
        name: 'Hassan Ahmed',
        relationship: 'Son',
        phone: '(555) 333-4444',
        email: 'hassan@example.com',
        isPrimary: false,
        notes: 'Works during the day. Available evenings and weekends.',
      },
      {
        careRecipientId: CR_ID,
        name: 'Zainab Ahmed',
        relationship: 'Daughter',
        phone: '(555) 555-6666',
        email: 'zainab@example.com',
        isPrimary: false,
        notes: 'Lives 30 minutes away. Available for emergencies.',
      },
    ],
  });

  // ============================================
  // 7. MEDICATIONS
  // ============================================
  console.log('💊 Creating medications...');
  const metformin = await prisma.medication.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Metformin',
      genericName: 'Metformin HCl',
      dosage: '500mg',
      form: 'TABLET',
      frequency: 'TWICE_DAILY',
      timesPerDay: 2,
      scheduledTimes: ['08:00', '20:00'],
      instructions: 'Take with meals. Do not skip doses.',
      prescribedBy: 'Dr. Raj Patel',
      pharmacy: 'Walgreens - Main St',
      pharmacyPhone: '(555) 999-1111',
      currentSupply: 45,
      refillAt: 10,
      lastRefillDate: daysAgo(20),
      isActive: true,
      notes: 'For type 2 diabetes management. Monitor blood sugar levels.',
    },
  });

  const lisinopril = await prisma.medication.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosage: '10mg',
      form: 'TABLET',
      frequency: 'DAILY',
      timesPerDay: 1,
      scheduledTimes: ['08:00'],
      instructions: 'Take in the morning. Monitor blood pressure.',
      prescribedBy: 'Dr. Sarah Lee',
      pharmacy: 'Walgreens - Main St',
      pharmacyPhone: '(555) 999-1111',
      currentSupply: 28,
      refillAt: 7,
      isActive: true,
    },
  });

  const amlodipine = await prisma.medication.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Amlodipine',
      genericName: 'Amlodipine Besylate',
      dosage: '5mg',
      form: 'TABLET',
      frequency: 'DAILY',
      timesPerDay: 1,
      scheduledTimes: ['08:00'],
      instructions: 'Take in the morning with Lisinopril.',
      prescribedBy: 'Dr. Sarah Lee',
      pharmacy: 'Walgreens - Main St',
      pharmacyPhone: '(555) 999-1111',
      currentSupply: 30,
      refillAt: 7,
      isActive: true,
    },
  });

  const vitaminD = await prisma.medication.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Vitamin D3',
      dosage: '2000 IU',
      form: 'CAPSULE',
      frequency: 'DAILY',
      timesPerDay: 1,
      scheduledTimes: ['12:00'],
      instructions: 'Take with lunch.',
      currentSupply: 60,
      refillAt: 15,
      isActive: true,
    },
  });

  const acetaminophen = await prisma.medication.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Acetaminophen',
      genericName: 'Acetaminophen',
      dosage: '500mg',
      form: 'TABLET',
      frequency: 'AS_NEEDED',
      timesPerDay: 0,
      scheduledTimes: [],
      instructions: 'For knee pain. Max 2000mg per day. Do not combine with alcohol.',
      prescribedBy: 'Dr. Michael Wilson',
      isActive: true,
      notes: 'Arthritis pain management. Track usage carefully.',
    },
  });

  const donepezil = await prisma.medication.create({
    data: {
      careRecipientId: CR_ID,
      name: 'Donepezil',
      genericName: 'Donepezil HCl',
      dosage: '5mg',
      form: 'TABLET',
      frequency: 'DAILY',
      timesPerDay: 1,
      scheduledTimes: ['21:00'],
      instructions: 'Take at bedtime. Report any unusual side effects.',
      prescribedBy: 'Dr. Lisa Nguyen',
      pharmacy: 'CVS Pharmacy',
      pharmacyPhone: '(555) 888-2222',
      currentSupply: 22,
      refillAt: 5,
      isActive: true,
      notes: 'For mild cognitive impairment.',
    },
  });

  const allMeds = [metformin, lisinopril, amlodipine, vitaminD, donepezil];

  // ============================================
  // 8. MEDICATION LOGS (past 14 days)
  // ============================================
  console.log('📋 Creating medication logs (14 days)...');
  const medLogData: any[] = [];
  for (let day = 13; day >= 0; day--) {
    for (const med of allMeds) {
      const times = med.scheduledTimes as string[];
      for (const timeStr of times) {
        const [h, m] = timeStr.split(':').map(Number);
        const scheduledTime = dayAt(-day, h, m);

        // Simulate realistic adherence: ~90% given, ~5% missed, ~5% skipped
        const roll = Math.random();
        let status: string;
        let givenTime: Date | null = null;

        if (roll < 0.88) {
          status = 'GIVEN';
          // Given within ±30 min of scheduled
          givenTime = new Date(scheduledTime.getTime() + (Math.random() - 0.3) * 30 * 60 * 1000);
        } else if (roll < 0.94) {
          status = 'MISSED';
        } else {
          status = 'SKIPPED';
        }

        medLogData.push({
          medicationId: med.id,
          givenById: USER_ID,
          scheduledTime,
          givenTime,
          status,
          skipReason: status === 'SKIPPED' ? 'Grandma refused - felt nauseous' : null,
          notes: status === 'MISSED' ? 'Was sleeping, did not want to wake her' : null,
        });
      }
    }
  }
  await prisma.medicationLog.createMany({ data: medLogData });
  console.log(`   Created ${medLogData.length} medication logs`);

  // ============================================
  // 9. APPOINTMENTS
  // ============================================
  console.log('📅 Creating appointments...');
  await prisma.appointment.createMany({
    data: [
      // Past appointments
      {
        careRecipientId: CR_ID,
        doctorId: drKhan.id,
        title: 'Annual Physical Checkup',
        type: 'DOCTOR_VISIT',
        startTime: dayAt(-21, 10, 0),
        endTime: dayAt(-21, 11, 0),
        location: '200 Health Plaza, Suite 301',
        notes: 'Routine physical. Blood work ordered. All vitals stable. Continue current medications.',
        status: 'COMPLETED',
      },
      {
        careRecipientId: CR_ID,
        doctorId: drPatel.id,
        title: 'Diabetes Quarterly Check',
        type: 'SPECIALIST',
        startTime: dayAt(-14, 14, 0),
        endTime: dayAt(-14, 14, 45),
        location: '450 Specialist Center, Floor 2',
        notes: 'A1C at 6.8% - well controlled. Continue Metformin 500mg twice daily. Next check in 3 months.',
        status: 'COMPLETED',
      },
      {
        careRecipientId: CR_ID,
        title: 'Blood Work - CBC & Metabolic Panel',
        type: 'LAB_WORK',
        startTime: dayAt(-7, 8, 30),
        endTime: dayAt(-7, 9, 0),
        location: 'Quest Diagnostics - Oak Street',
        notes: 'Fasting required. Results sent to Dr. Khan.',
        status: 'COMPLETED',
      },
      {
        careRecipientId: CR_ID,
        doctorId: drWilson.id,
        title: 'Knee Pain Follow-Up',
        type: 'SPECIALIST',
        startTime: dayAt(-3, 11, 0),
        endTime: dayAt(-3, 11, 30),
        location: '300 Bone & Joint Clinic',
        notes: 'Cortisone injection administered in right knee. Mild improvement expected within 48 hours.',
        status: 'COMPLETED',
      },
      // Today
      {
        careRecipientId: CR_ID,
        title: 'Physical Therapy Session',
        type: 'PHYSICAL_THERAPY',
        startTime: today(15, 0),
        endTime: today(16, 0),
        location: 'ActiveCare Physical Therapy',
        notes: 'Focus on knee mobility and gentle strength exercises.',
        status: 'SCHEDULED',
      },
      // Future appointments
      {
        careRecipientId: CR_ID,
        doctorId: drLee.id,
        title: 'Cardiology Follow-Up',
        type: 'SPECIALIST',
        startTime: dayAt(5, 9, 30),
        endTime: dayAt(5, 10, 15),
        location: '100 Heart Health Ave',
        notes: 'BP review. May adjust Lisinopril dosage.',
        status: 'SCHEDULED',
      },
      {
        careRecipientId: CR_ID,
        doctorId: drNguyen.id,
        title: 'Cognitive Assessment',
        type: 'SPECIALIST',
        startTime: dayAt(12, 13, 0),
        endTime: dayAt(12, 14, 0),
        location: '500 Brain Health Institute',
        notes: 'Six-month cognitive evaluation. Bring list of any memory concerns.',
        status: 'SCHEDULED',
      },
      {
        careRecipientId: CR_ID,
        title: 'Chest X-Ray',
        type: 'IMAGING',
        startTime: dayAt(18, 10, 0),
        endTime: dayAt(18, 10, 30),
        location: 'City General Radiology',
        notes: 'Routine chest X-ray ordered by Dr. Khan.',
        status: 'SCHEDULED',
      },
      {
        careRecipientId: CR_ID,
        doctorId: drKhan.id,
        title: 'Primary Care Follow-Up',
        type: 'DOCTOR_VISIT',
        startTime: dayAt(25, 10, 0),
        endTime: dayAt(25, 10, 45),
        location: '200 Health Plaza, Suite 301',
        notes: 'Review lab results and chest X-ray. Medication review.',
        status: 'SCHEDULED',
      },
    ],
  });

  // ============================================
  // 10. CAREGIVER SHIFTS
  // ============================================
  console.log('👤 Creating caregiver shifts...');
  const shiftData: any[] = [];
  for (let day = 6; day >= 0; day--) {
    // Morning shift
    shiftData.push({
      careRecipientId: CR_ID,
      caregiverId: USER_ID,
      startTime: dayAt(-day, 7, 0),
      endTime: dayAt(-day, 15, 0),
      status: day === 0 ? 'IN_PROGRESS' : 'COMPLETED',
      checkedInAt: dayAt(-day, 6, 55),
      checkedOutAt: day === 0 ? null : dayAt(-day, 15, 5),
      notes: day === 0 ? 'Morning shift started' : 'Regular morning care routine completed',
    });
  }
  // Future shifts
  for (let day = 1; day <= 7; day++) {
    shiftData.push({
      careRecipientId: CR_ID,
      caregiverId: USER_ID,
      startTime: dayAt(day, 7, 0),
      endTime: dayAt(day, 15, 0),
      status: 'SCHEDULED',
    });
  }
  await prisma.caregiverShift.createMany({ data: shiftData });

  // ============================================
  // 11. TIMELINE ENTRIES (last 14 days, rich data)
  // ============================================
  console.log('📝 Creating timeline entries...');
  const timelineData: any[] = [];

  // --- Day -13: Start of tracking ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'NOTE', title: 'Started daily care tracking',
    description: 'Beginning to track Grandma\'s daily activities, meals, vitals, and mood using CareCircle.',
    severity: 'LOW', occurredAt: dayAt(-13, 8, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Morning vitals check',
    description: 'Blood pressure slightly elevated this morning. Will monitor throughout the day.',
    severity: 'MEDIUM', occurredAt: dayAt(-13, 8, 30),
    vitals: { bloodPressure: '145/92', heartRate: 78, temperature: 98.4, oxygenLevel: 97 },
  });

  // --- Day -12 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MEAL', title: 'Good appetite at breakfast',
    description: 'Grandma ate a full breakfast: oatmeal with berries, scrambled eggs, and chai tea. Drank a full glass of water.',
    severity: 'LOW', occurredAt: dayAt(-12, 8, 45),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'ACTIVITY', title: 'Morning garden walk',
    description: 'Walked around the garden for 15 minutes with walker. Enjoyed looking at the flowers. Seemed happy.',
    severity: 'LOW', occurredAt: dayAt(-12, 10, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Afternoon vitals',
    description: 'Blood pressure improved after morning walk.',
    severity: 'LOW', occurredAt: dayAt(-12, 14, 0),
    vitals: { bloodPressure: '132/85', heartRate: 72, temperature: 98.6, oxygenLevel: 98 },
  });

  // --- Day -11 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MOOD', title: 'Feeling anxious about doctor visit',
    description: 'Grandma seems anxious about upcoming diabetes checkup. Reassured her that her blood sugar has been well-controlled.',
    severity: 'MEDIUM', occurredAt: dayAt(-11, 9, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'SLEEP', title: 'Restless night',
    description: 'Grandma woke up twice during the night. Said she had trouble falling back asleep. Total sleep about 5 hours.',
    severity: 'MEDIUM', occurredAt: dayAt(-11, 7, 0),
  });

  // --- Day -10 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Morning vitals - good numbers',
    description: 'All vitals looking good today. Blood pressure well within target range.',
    severity: 'LOW', occurredAt: dayAt(-10, 8, 0),
    vitals: { bloodPressure: '128/82', heartRate: 70, temperature: 98.2, oxygenLevel: 98, bloodSugar: 142 },
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MEAL', title: 'Lunch - ate well',
    description: 'Had chicken soup with naan bread. Drank lemonade. Good appetite today.',
    severity: 'LOW', occurredAt: dayAt(-10, 12, 30),
  });

  // --- Day -9 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'INCIDENT', title: 'Near-fall in bathroom',
    description: 'Grandma slipped on wet floor in bathroom but caught herself on the grab bar. No injury. Need to put non-slip mat down.',
    severity: 'HIGH', occurredAt: dayAt(-9, 11, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'NOTE', title: 'Installed non-slip mat',
    description: 'Placed non-slip mats in bathroom and added an extra grab bar near the toilet. Also improved lighting.',
    severity: 'LOW', occurredAt: dayAt(-9, 15, 0),
  });

  // --- Day -8 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MOOD', title: 'Very happy today',
    description: 'Had a video call with her granddaughter. Was laughing and telling stories. Best mood this week.',
    severity: 'LOW', occurredAt: dayAt(-8, 16, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'ACTIVITY', title: 'Chair exercises',
    description: 'Did 20 minutes of seated exercises from the physical therapy handout. Good range of motion.',
    severity: 'LOW', occurredAt: dayAt(-8, 10, 0),
  });

  // --- Day -7 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Weekly vitals summary',
    description: 'Blood pressure trending down nicely. Blood sugar stable. Heart rate normal.',
    severity: 'LOW', occurredAt: dayAt(-7, 8, 0),
    vitals: { bloodPressure: '130/84', heartRate: 74, temperature: 98.4, oxygenLevel: 97, bloodSugar: 138 },
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'APPOINTMENT_SUMMARY', title: 'Lab work completed',
    description: 'Went to Quest Diagnostics for blood work. Grandma was brave with the needle. Fasting went well. Results in 2-3 days.',
    severity: 'LOW', occurredAt: dayAt(-7, 9, 30),
  });

  // --- Day -6 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'SYMPTOM', title: 'Knee pain increased',
    description: 'Grandma complaining of increased right knee pain today. Gave acetaminophen 500mg. Applied ice pack for 15 minutes.',
    severity: 'MEDIUM', occurredAt: dayAt(-6, 11, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'SLEEP', title: 'Slept well',
    description: 'Fell asleep at 9:30 PM, woke up once briefly at 2 AM, then slept until 7 AM. About 9 hours total. Seems rested.',
    severity: 'LOW', occurredAt: dayAt(-6, 7, 30),
  });

  // --- Day -5 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MEAL', title: 'Refused lunch',
    description: 'Grandma didn\'t want to eat lunch today. Said she wasn\'t hungry. Made sure she drank water and had a light snack (crackers and cheese) later.',
    severity: 'MEDIUM', occurredAt: dayAt(-5, 13, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Evening vitals',
    description: 'Checked vitals before bed. Blood sugar slightly high - possibly from the snacking pattern today.',
    severity: 'MEDIUM', occurredAt: dayAt(-5, 20, 0),
    vitals: { bloodPressure: '135/88', heartRate: 76, bloodSugar: 168 },
  });

  // --- Day -4 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MOOD', title: 'Confused this morning',
    description: 'Grandma was a bit confused when she woke up, asked what day it was twice. Oriented herself after breakfast. Will mention to Dr. Nguyen.',
    severity: 'MEDIUM', occurredAt: dayAt(-4, 7, 30),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'ACTIVITY', title: 'Gardening with assistance',
    description: 'Helped Grandma pot some herbs on the patio. She was engaged and remembered all the plant names. Fine motor skills looked good.',
    severity: 'LOW', occurredAt: dayAt(-4, 10, 30),
  });

  // --- Day -3 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'APPOINTMENT_SUMMARY', title: 'Knee injection went well',
    description: 'Dr. Wilson gave cortisone injection in right knee. Said it should reduce pain within 48 hours. No strenuous activity for 24 hours.',
    severity: 'LOW', occurredAt: dayAt(-3, 12, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Post-appointment vitals',
    description: 'Checked vitals after getting home from appointment.',
    severity: 'LOW', occurredAt: dayAt(-3, 14, 0),
    vitals: { bloodPressure: '138/86', heartRate: 80, temperature: 98.6, oxygenLevel: 97 },
  });

  // --- Day -2 ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'SYMPTOM', title: 'Knee pain improving',
    description: 'Grandma says knee feels much better after the cortisone injection yesterday. Can walk more comfortably with walker.',
    severity: 'LOW', occurredAt: dayAt(-2, 9, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MEAL', title: 'Great appetite today',
    description: 'Ate breakfast, lunch, and dinner with good portions. Had biryani for dinner - her favourite. Drank plenty of water.',
    severity: 'LOW', occurredAt: dayAt(-2, 19, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'BATHROOM', title: 'Bathroom routine normal',
    description: 'Regular bathroom routine today. No issues. Using grab bars and non-slip mat properly.',
    severity: 'LOW', occurredAt: dayAt(-2, 16, 0),
  });

  // --- Day -1 (yesterday) ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Morning vitals - excellent',
    description: 'Best readings this week! Blood pressure nicely controlled.',
    severity: 'LOW', occurredAt: dayAt(-1, 8, 0),
    vitals: { bloodPressure: '126/80', heartRate: 68, temperature: 98.2, oxygenLevel: 98, bloodSugar: 130 },
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'ACTIVITY', title: 'Walked to the mailbox',
    description: 'Grandma walked to the mailbox and back with her walker. About 200 feet total. No shortness of breath. Big improvement!',
    severity: 'LOW', occurredAt: dayAt(-1, 10, 30),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MOOD', title: 'Happy and talkative',
    description: 'Grandma was in great spirits all day. Told stories about her childhood. Laughed a lot. Good cognitive day.',
    severity: 'LOW', occurredAt: dayAt(-1, 15, 0),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'SLEEP', title: 'Full night of sleep',
    description: 'Slept 8 hours straight. No nighttime waking. Woke up refreshed and alert.',
    severity: 'LOW', occurredAt: dayAt(-1, 7, 0),
  });

  // --- Today ---
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'VITALS', title: 'Morning vitals check',
    description: 'Good numbers to start the day. Blood sugar a bit high - will check again before lunch.',
    severity: 'LOW', occurredAt: today(8, 0),
    vitals: { bloodPressure: '132/84', heartRate: 72, temperature: 98.4, oxygenLevel: 97, bloodSugar: 155 },
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'MEAL', title: 'Light breakfast',
    description: 'Had toast with peanut butter and a banana. Drank green tea. Ate about 75% of the meal.',
    severity: 'LOW', occurredAt: today(8, 30),
  });
  timelineData.push({
    careRecipientId: CR_ID, createdById: USER_ID,
    type: 'NOTE', title: 'Physical therapy prep',
    description: 'Preparing for this afternoon\'s physical therapy session. Laid out comfortable clothes and shoes. Reminded Grandma about the appointment.',
    severity: 'LOW', occurredAt: today(11, 0),
  });

  await prisma.timelineEntry.createMany({ data: timelineData });
  console.log(`   Created ${timelineData.length} timeline entries`);

  // ============================================
  // 12. DOCUMENTS
  // ============================================
  console.log('📄 Creating documents...');
  await prisma.document.createMany({
    data: [
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Medicare Insurance Card',
        type: 'INSURANCE_CARD',
        status: 'READY',
        mimeType: 'image/jpeg',
        sizeBytes: 245000,
        notes: 'Front and back of Medicare Advantage card. Policy #MCR-2024-887341.',
      },
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Photo ID - State ID',
        type: 'PHOTO_ID',
        status: 'READY',
        mimeType: 'image/jpeg',
        sizeBytes: 320000,
        notes: 'State-issued photo ID. Expires 2027.',
      },
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Dr. Khan - Annual Physical Report',
        type: 'MEDICAL_RECORD',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 890000,
        notes: 'Full report from January 2026 annual physical. All results normal.',
      },
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Lab Results - CBC & Metabolic Panel',
        type: 'LAB_RESULT',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 456000,
        notes: 'Recent lab work from Quest Diagnostics. A1C: 6.8%, Kidney function normal.',
      },
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Metformin Prescription',
        type: 'PRESCRIPTION',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 125000,
        notes: 'Current prescription for Metformin 500mg twice daily. Valid until Dec 2026.',
      },
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Power of Attorney',
        type: 'POWER_OF_ATTORNEY',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 1200000,
        notes: 'Durable Power of Attorney designating Hassan Ahmed (son) as healthcare proxy.',
      },
      {
        familyId: family.id,
        uploadedById: USER_ID,
        name: 'Living Will / Advance Directive',
        type: 'LIVING_WILL',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 780000,
        notes: 'Advance directive signed March 2024. Notarized copy.',
      },
    ],
  });

  // ============================================
  // 13. NOTIFICATIONS
  // ============================================
  console.log('🔔 Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: USER_ID,
        type: 'MEDICATION_REMINDER',
        title: 'Medication Due',
        body: 'Metformin 500mg is due for Grandma at 8:00 PM',
        read: false,
        createdAt: today(19, 45),
      },
      {
        userId: USER_ID,
        type: 'APPOINTMENT_REMINDER',
        title: 'Appointment Tomorrow',
        body: 'Physical Therapy session at ActiveCare at 3:00 PM',
        read: true,
        readAt: today(9, 0),
        createdAt: dayAt(-1, 18, 0),
      },
      {
        userId: USER_ID,
        type: 'REFILL_ALERT',
        title: 'Refill Needed Soon',
        body: 'Donepezil 5mg supply is running low (22 left, refill at 5)',
        read: false,
        createdAt: daysAgo(1),
      },
      {
        userId: USER_ID,
        type: 'TIMELINE_UPDATE',
        title: 'New Timeline Entry',
        body: 'You logged a vitals check for Grandma',
        read: true,
        readAt: today(8, 5),
        createdAt: today(8, 0),
      },
      {
        userId: USER_ID,
        type: 'SHIFT_REMINDER',
        title: 'Shift Starting',
        body: 'Your morning caregiving shift starts at 7:00 AM',
        read: true,
        readAt: today(6, 50),
        createdAt: today(6, 30),
      },
    ],
  });

  // ============================================
  // DONE
  // ============================================
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           ✅ SEED COMPLETE FOR ali123@example.com        ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Family:    ${family.name.padEnd(42)}║`);
  console.log(`║  Family ID: ${family.id}  ║`);
  console.log(`║  Care Recipient: ${careRecipient.fullName.padEnd(37)}║`);
  console.log(`║  CR ID:     ${CR_ID}  ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Data created:                                          ║');
  console.log('║    • 5 Doctors                                          ║');
  console.log('║    • 3 Emergency Contacts                               ║');
  console.log('║    • 6 Medications (5 active daily + 1 as-needed)       ║');
  console.log(`║    • ${String(medLogData.length).padEnd(3)} Medication Logs (14 days)                    ║`);
  console.log('║    • 9 Appointments (4 past, 1 today, 4 future)         ║');
  console.log(`║    • ${String(shiftData.length).padEnd(2)} Caregiver Shifts (7 past + 7 future)          ║`);
  console.log(`║    • ${String(timelineData.length).padEnd(2)} Timeline Entries (14 days of rich data)      ║`);
  console.log('║    • 7 Documents                                        ║');
  console.log('║    • 5 Notifications                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
