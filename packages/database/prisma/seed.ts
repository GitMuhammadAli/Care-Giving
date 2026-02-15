/**
 * CareCircle Database Seed Script
 * Creates comprehensive test data for all features
 *
 * Usage:
 *   npx prisma db seed
 *   or
 *   npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to get random date in range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper to set time on date
function setTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean up existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning up existing data...');
  await prisma.notification.deleteMany();
  await prisma.emergencyAlert.deleteMany();
  await prisma.medicationLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.transportAssignment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.caregiverShift.deleteMany();
  await prisma.timelineEntry.deleteMany();
  await prisma.document.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.careRecipient.deleteMany();
  await prisma.familyInvitation.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();
  await prisma.session.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // TEST PASSWORD FOR ALL USERS
  // ============================================
  // Easy password for testing: Test1234!
  const TEST_PASSWORD = 'Test1234!';
  const passwordHash = await hashPassword(TEST_PASSWORD);

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🔐 TEST PASSWORD FOR ALL USERS                  ║');
  console.log('║                                                           ║');
  console.log('║                     Test1234!                             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // ============================================
  // 1. CREATE USERS (All use password: Test1234!)
  // ============================================
  console.log('👤 Creating users...');

  const users = await Promise.all([
    // Admin user - Email: admin@carecircle.com | Password: Test1234!
    prisma.user.create({
      data: {
        email: 'admin@carecircle.com',  // Password: Test1234!
        passwordHash,
        fullName: 'Sarah Johnson',
        phone: '+1-555-0101',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        preferences: {
          notifications: { email: true, push: true, sms: false },
          theme: 'light',
        },
      },
    }),
    // Caregiver 1 - Email: caregiver1@carecircle.com | Password: Test1234!
    prisma.user.create({
      data: {
        email: 'caregiver1@carecircle.com',  // Password: Test1234!
        passwordHash,
        fullName: 'Michael Chen',
        phone: '+1-555-0102',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    }),
    // Caregiver 2 - Email: caregiver2@carecircle.com | Password: Test1234!
    prisma.user.create({
      data: {
        email: 'caregiver2@carecircle.com',  // Password: Test1234!
        passwordHash,
        fullName: 'Emily Rodriguez',
        phone: '+1-555-0103',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    }),
    // Viewer - Email: viewer@carecircle.com | Password: Test1234!
    prisma.user.create({
      data: {
        email: 'viewer@carecircle.com',  // Password: Test1234!
        passwordHash,
        fullName: 'David Thompson',
        phone: '+1-555-0104',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    }),
    // Admin 2 - Email: admin2@carecircle.com | Password: Test1234!
    prisma.user.create({
      data: {
        email: 'admin2@carecircle.com',  // Password: Test1234!
        passwordHash,
        fullName: 'Jennifer Williams',
        phone: '+1-555-0105',
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    }),
  ]);

  console.log(`   ✅ Created ${users.length} users`);

  // ============================================
  // 2. CREATE FAMILIES
  // ============================================
  console.log('👨‍👩‍👧‍👦 Creating families...');

  const families = await Promise.all([
    prisma.family.create({
      data: {
        name: 'Johnson Family Care',
      },
    }),
    prisma.family.create({
      data: {
        name: 'Williams Senior Care',
      },
    }),
  ]);

  console.log(`   ✅ Created ${families.length} families`);

  // ============================================
  // 3. CREATE FAMILY MEMBERSHIPS
  // ============================================
  console.log('🔗 Creating family memberships...');

  await Promise.all([
    // Johnson Family
    prisma.familyMember.create({
      data: {
        familyId: families[0].id,
        userId: users[0].id, // Sarah - Admin
        role: 'ADMIN',
        nickname: 'Sarah',
      },
    }),
    prisma.familyMember.create({
      data: {
        familyId: families[0].id,
        userId: users[1].id, // Michael - Caregiver
        role: 'CAREGIVER',
        nickname: 'Mike',
      },
    }),
    prisma.familyMember.create({
      data: {
        familyId: families[0].id,
        userId: users[2].id, // Emily - Caregiver
        role: 'CAREGIVER',
        nickname: 'Em',
      },
    }),
    prisma.familyMember.create({
      data: {
        familyId: families[0].id,
        userId: users[3].id, // David - Viewer
        role: 'VIEWER',
        nickname: 'Dave',
      },
    }),
    // Williams Family
    prisma.familyMember.create({
      data: {
        familyId: families[1].id,
        userId: users[4].id, // Jennifer - Admin
        role: 'ADMIN',
        nickname: 'Jen',
      },
    }),
  ]);

  console.log(`   ✅ Created family memberships`);

  // ============================================
  // 4. CREATE CARE RECIPIENTS
  // ============================================
  console.log('❤️ Creating care recipients...');

  const careRecipients = await Promise.all([
    // Johnson Family - Mom
    prisma.careRecipient.create({
      data: {
        familyId: families[0].id,
        fullName: 'Margaret Johnson',
        preferredName: 'Grandma Maggie',
        dateOfBirth: new Date('1945-03-15'),
        bloodType: 'O+',
        allergies: ['Penicillin', 'Sulfa drugs', 'Shellfish'],
        conditions: ['Type 2 Diabetes', 'Hypertension', 'Mild Dementia', 'Osteoarthritis'],
        notes: 'Prefers to be called Maggie. Enjoys gardening and watching game shows. Needs assistance with bathing and dressing.',
        primaryHospital: 'Memorial General Hospital',
        hospitalAddress: '1234 Healthcare Blvd, Springfield, IL 62701',
        insuranceProvider: 'BlueCross BlueShield',
        insurancePolicyNo: 'BCB-123456789',
      },
    }),
    // Johnson Family - Dad
    prisma.careRecipient.create({
      data: {
        familyId: families[0].id,
        fullName: 'Robert Johnson',
        preferredName: 'Grandpa Bob',
        dateOfBirth: new Date('1943-07-22'),
        bloodType: 'A+',
        allergies: ['Aspirin', 'Latex'],
        conditions: ['COPD', 'Atrial Fibrillation', 'Hearing Loss'],
        notes: 'Uses hearing aids. Former engineer, loves puzzles and chess. Independent with most activities but needs medication reminders.',
        primaryHospital: 'Memorial General Hospital',
        hospitalAddress: '1234 Healthcare Blvd, Springfield, IL 62701',
        insuranceProvider: 'Medicare Advantage',
        insurancePolicyNo: 'MA-987654321',
      },
    }),
    // Williams Family
    prisma.careRecipient.create({
      data: {
        familyId: families[1].id,
        fullName: 'Eleanor Williams',
        preferredName: 'Ellie',
        dateOfBirth: new Date('1938-11-08'),
        bloodType: 'B-',
        allergies: ['Codeine', 'Ibuprofen'],
        conditions: ["Parkinson's Disease", 'Anxiety', 'Glaucoma'],
        notes: 'Tremors more pronounced in morning. Enjoys classical music and painting. Needs walker for mobility.',
        primaryHospital: 'St. Mary Medical Center',
        hospitalAddress: '5678 Wellness Way, Springfield, IL 62702',
        insuranceProvider: 'Aetna Medicare',
        insurancePolicyNo: 'AET-456789123',
      },
    }),
  ]);

  console.log(`   ✅ Created ${careRecipients.length} care recipients`);

  // ============================================
  // 5. CREATE DOCTORS
  // ============================================
  console.log('👨‍⚕️ Creating doctors...');

  const doctors = await Promise.all([
    // For Margaret
    prisma.doctor.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Dr. Amanda Foster',
        specialty: 'Primary Care Physician',
        phone: '+1-555-1001',
        fax: '+1-555-1002',
        email: 'dr.foster@memorialhealth.com',
        address: '100 Medical Plaza, Suite 200, Springfield, IL 62701',
        notes: 'Primary care - sees quarterly',
      },
    }),
    prisma.doctor.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Dr. James Lee',
        specialty: 'Endocrinologist',
        phone: '+1-555-1003',
        email: 'dr.lee@diabetescare.com',
        address: '200 Specialty Center, Springfield, IL 62701',
        notes: 'Diabetes management - sees every 3 months',
      },
    }),
    prisma.doctor.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Dr. Patricia Moore',
        specialty: 'Neurologist',
        phone: '+1-555-1004',
        email: 'dr.moore@neurocare.com',
        address: '300 Brain Health Center, Springfield, IL 62701',
        notes: 'Dementia specialist - sees every 6 months',
      },
    }),
    // For Robert
    prisma.doctor.create({
      data: {
        careRecipientId: careRecipients[1].id,
        name: 'Dr. William Chen',
        specialty: 'Pulmonologist',
        phone: '+1-555-1005',
        email: 'dr.chen@lungcare.com',
        address: '400 Respiratory Center, Springfield, IL 62701',
        notes: 'COPD management',
      },
    }),
    prisma.doctor.create({
      data: {
        careRecipientId: careRecipients[1].id,
        name: 'Dr. Karen White',
        specialty: 'Cardiologist',
        phone: '+1-555-1006',
        email: 'dr.white@heartcare.com',
        address: '500 Cardiology Associates, Springfield, IL 62701',
        notes: 'Afib management - on blood thinners',
      },
    }),
    // For Eleanor
    prisma.doctor.create({
      data: {
        careRecipientId: careRecipients[2].id,
        name: 'Dr. Richard Park',
        specialty: 'Movement Disorder Specialist',
        phone: '+1-555-1007',
        email: 'dr.park@parkinsonscare.com',
        address: '600 Movement Disorder Clinic, Springfield, IL 62702',
        notes: "Parkinson's specialist",
      },
    }),
  ]);

  console.log(`   ✅ Created ${doctors.length} doctors`);

  // ============================================
  // 6. CREATE EMERGENCY CONTACTS
  // ============================================
  console.log('🆘 Creating emergency contacts...');

  await Promise.all([
    // For Margaret & Robert (shared)
    prisma.emergencyContact.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Sarah Johnson',
        relationship: 'Daughter',
        phone: '+1-555-0101',
        email: 'admin@carecircle.com',
        isPrimary: true,
        notes: 'Primary contact for all decisions',
      },
    }),
    prisma.emergencyContact.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Thomas Johnson',
        relationship: 'Son',
        phone: '+1-555-2001',
        email: 'thomas.j@email.com',
        isPrimary: false,
        notes: 'Lives out of state, available by phone',
      },
    }),
    prisma.emergencyContact.create({
      data: {
        careRecipientId: careRecipients[1].id,
        name: 'Sarah Johnson',
        relationship: 'Daughter',
        phone: '+1-555-0101',
        email: 'admin@carecircle.com',
        isPrimary: true,
      },
    }),
    // For Eleanor
    prisma.emergencyContact.create({
      data: {
        careRecipientId: careRecipients[2].id,
        name: 'Jennifer Williams',
        relationship: 'Daughter',
        phone: '+1-555-0105',
        email: 'admin2@carecircle.com',
        isPrimary: true,
      },
    }),
    prisma.emergencyContact.create({
      data: {
        careRecipientId: careRecipients[2].id,
        name: 'Mark Williams',
        relationship: 'Son',
        phone: '+1-555-2002',
        email: 'mark.w@email.com',
        isPrimary: false,
        notes: 'Healthcare proxy',
      },
    }),
  ]);

  console.log(`   ✅ Created emergency contacts`);

  // ============================================
  // 7. CREATE MEDICATIONS
  // ============================================
  console.log('💊 Creating medications...');

  const medications = await Promise.all([
    // Margaret's medications
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Metformin',
        genericName: 'Metformin HCL',
        dosage: '500mg',
        form: 'TABLET',
        instructions: 'Take with meals to reduce stomach upset',
        prescribedBy: 'Dr. James Lee',
        pharmacy: 'CVS Pharmacy',
        pharmacyPhone: '+1-555-7001',
        frequency: 'TWICE_DAILY',
        timesPerDay: 2,
        scheduledTimes: ['08:00', '18:00'],
        currentSupply: 45,
        refillAt: 14,
        lastRefillDate: addDays(new Date(), -15),
        isActive: true,
        notes: 'For diabetes management',
      },
    }),
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Lisinopril',
        dosage: '10mg',
        form: 'TABLET',
        instructions: 'Take in the morning',
        prescribedBy: 'Dr. Amanda Foster',
        pharmacy: 'CVS Pharmacy',
        pharmacyPhone: '+1-555-7001',
        frequency: 'DAILY',
        timesPerDay: 1,
        scheduledTimes: ['08:00'],
        currentSupply: 28,
        refillAt: 7,
        isActive: true,
        notes: 'Blood pressure medication',
      },
    }),
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[0].id,
        name: 'Donepezil',
        genericName: 'Aricept',
        dosage: '5mg',
        form: 'TABLET',
        instructions: 'Take at bedtime',
        prescribedBy: 'Dr. Patricia Moore',
        pharmacy: 'Walgreens',
        pharmacyPhone: '+1-555-7002',
        frequency: 'DAILY',
        timesPerDay: 1,
        scheduledTimes: ['21:00'],
        currentSupply: 20,
        refillAt: 10,
        isActive: true,
        notes: 'For memory - may cause vivid dreams',
      },
    }),
    // Robert's medications
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[1].id,
        name: 'Eliquis',
        genericName: 'Apixaban',
        dosage: '5mg',
        form: 'TABLET',
        instructions: 'Take with or without food',
        prescribedBy: 'Dr. Karen White',
        pharmacy: 'CVS Pharmacy',
        pharmacyPhone: '+1-555-7001',
        frequency: 'TWICE_DAILY',
        timesPerDay: 2,
        scheduledTimes: ['08:00', '20:00'],
        currentSupply: 56,
        refillAt: 14,
        isActive: true,
        notes: 'Blood thinner - watch for bleeding',
      },
    }),
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[1].id,
        name: 'Spiriva',
        genericName: 'Tiotropium',
        dosage: '2.5mcg',
        form: 'INHALER',
        instructions: 'Two puffs once daily in the morning',
        prescribedBy: 'Dr. William Chen',
        pharmacy: 'Walgreens',
        pharmacyPhone: '+1-555-7002',
        frequency: 'DAILY',
        timesPerDay: 1,
        scheduledTimes: ['07:00'],
        currentSupply: 1,
        refillAt: 1,
        isActive: true,
        notes: 'COPD maintenance inhaler',
      },
    }),
    // Eleanor's medications
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[2].id,
        name: 'Sinemet',
        genericName: 'Carbidopa-Levodopa',
        dosage: '25/100mg',
        form: 'TABLET',
        instructions: 'Take 30 minutes before meals',
        prescribedBy: 'Dr. Richard Park',
        pharmacy: 'Rite Aid',
        pharmacyPhone: '+1-555-7003',
        frequency: 'THREE_TIMES_DAILY',
        timesPerDay: 3,
        scheduledTimes: ['07:00', '13:00', '19:00'],
        currentSupply: 60,
        refillAt: 20,
        isActive: true,
        notes: "Parkinson's medication - timing is important",
      },
    }),
    prisma.medication.create({
      data: {
        careRecipientId: careRecipients[2].id,
        name: 'Latanoprost',
        dosage: '0.005%',
        form: 'DROPS',
        instructions: 'One drop in each eye at bedtime',
        prescribedBy: 'Dr. Eye Specialist',
        pharmacy: 'Rite Aid',
        pharmacyPhone: '+1-555-7003',
        frequency: 'DAILY',
        timesPerDay: 1,
        scheduledTimes: ['21:00'],
        currentSupply: 1,
        refillAt: 1,
        isActive: true,
        notes: 'Glaucoma eye drops - may darken eyelashes',
      },
    }),
  ]);

  console.log(`   ✅ Created ${medications.length} medications`);

  // ============================================
  // 8. CREATE MEDICATION LOGS
  // ============================================
  console.log('📝 Creating medication logs...');

  const today = new Date();
  const logEntries = [];

  // Create logs for past 7 days for each medication
  for (let dayOffset = -7; dayOffset <= 0; dayOffset++) {
    const logDate = addDays(today, dayOffset);

    for (const med of medications) {
      for (const timeStr of med.scheduledTimes) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const scheduledTime = setTime(logDate, hours, minutes);

        // Skip future times
        if (scheduledTime > today) continue;

        // 90% given, 5% skipped, 5% missed
        const rand = Math.random();
        let status: 'GIVEN' | 'SKIPPED' | 'MISSED';
        let givenTime: Date | null = null;
        let skipReason: string | null = null;

        if (rand < 0.9) {
          status = 'GIVEN';
          // Given within 30 minutes of scheduled time
          givenTime = new Date(scheduledTime.getTime() + Math.random() * 30 * 60 * 1000);
        } else if (rand < 0.95) {
          status = 'SKIPPED';
          skipReason = randomItem(['Nausea', 'Doctor advised skip', 'Ran out of medication', 'Refused']);
        } else {
          status = 'MISSED';
        }

        logEntries.push({
          medicationId: med.id,
          givenById: randomItem([users[0].id, users[1].id, users[2].id]),
          scheduledTime,
          givenTime,
          status,
          skipReason,
        });
      }
    }
  }

  await prisma.medicationLog.createMany({ data: logEntries });
  console.log(`   ✅ Created ${logEntries.length} medication logs`);

  // ============================================
  // 9. CREATE APPOINTMENTS
  // ============================================
  console.log('📅 Creating appointments...');

  const appointments = await Promise.all([
    // Past appointments
    prisma.appointment.create({
      data: {
        careRecipientId: careRecipients[0].id,
        doctorId: doctors[0].id,
        title: 'Quarterly Checkup with Dr. Foster',
        type: 'DOCTOR_VISIT',
        startTime: addDays(today, -14),
        endTime: new Date(addDays(today, -14).getTime() + 60 * 60 * 1000),
        location: 'Medical Plaza',
        address: '100 Medical Plaza, Suite 200, Springfield, IL 62701',
        notes: 'Bring medication list',
        status: 'COMPLETED',
        reminderMinutes: [60, 1440],
      },
    }),
    // Upcoming appointments
    prisma.appointment.create({
      data: {
        careRecipientId: careRecipients[0].id,
        doctorId: doctors[1].id,
        title: 'Diabetes Follow-up',
        type: 'SPECIALIST',
        startTime: setTime(addDays(today, 3), 10, 0),
        endTime: setTime(addDays(today, 3), 11, 0),
        location: 'Specialty Center',
        address: '200 Specialty Center, Springfield, IL 62701',
        notes: 'Fasting blood work - no food after midnight',
        status: 'SCHEDULED',
        reminderMinutes: [60, 1440, 10080], // 1 hour, 1 day, 1 week
      },
    }),
    prisma.appointment.create({
      data: {
        careRecipientId: careRecipients[0].id,
        title: 'Physical Therapy Session',
        type: 'PHYSICAL_THERAPY',
        startTime: setTime(addDays(today, 1), 14, 0),
        endTime: setTime(addDays(today, 1), 15, 0),
        location: 'RehabCare Center',
        address: '789 Wellness St, Springfield, IL 62701',
        notes: 'Wear comfortable clothes',
        status: 'CONFIRMED',
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      },
    }),
    prisma.appointment.create({
      data: {
        careRecipientId: careRecipients[1].id,
        doctorId: doctors[4].id,
        title: 'Cardiology Checkup',
        type: 'SPECIALIST',
        startTime: setTime(addDays(today, 7), 9, 30),
        endTime: setTime(addDays(today, 7), 10, 30),
        location: 'Cardiology Associates',
        address: '500 Cardiology Associates, Springfield, IL 62701',
        notes: 'Bring recent ECG results',
        status: 'SCHEDULED',
      },
    }),
    prisma.appointment.create({
      data: {
        careRecipientId: careRecipients[1].id,
        title: 'Lab Work - Blood Panel',
        type: 'LAB_WORK',
        startTime: setTime(addDays(today, 5), 8, 0),
        endTime: setTime(addDays(today, 5), 8, 30),
        location: 'LabCorp',
        address: '456 Lab Way, Springfield, IL 62701',
        notes: 'Fasting required',
        status: 'SCHEDULED',
      },
    }),
    prisma.appointment.create({
      data: {
        careRecipientId: careRecipients[2].id,
        doctorId: doctors[5].id,
        title: "Parkinson's Medication Review",
        type: 'SPECIALIST',
        startTime: setTime(addDays(today, 10), 11, 0),
        endTime: setTime(addDays(today, 10), 12, 0),
        location: 'Movement Disorder Clinic',
        address: '600 Movement Disorder Clinic, Springfield, IL 62702',
        status: 'SCHEDULED',
      },
    }),
  ]);

  // Add transport assignment to one appointment
  await prisma.transportAssignment.create({
    data: {
      appointmentId: appointments[1].id,
      assignedToId: users[1].id, // Michael
      notes: 'Pick up at 9:15 AM',
      confirmed: true,
    },
  });

  console.log(`   ✅ Created ${appointments.length} appointments`);

  // ============================================
  // 10. CREATE CAREGIVER SHIFTS
  // ============================================
  console.log('⏰ Creating caregiver shifts...');

  const shifts = [];
  for (let dayOffset = -3; dayOffset <= 7; dayOffset++) {
    const shiftDate = addDays(today, dayOffset);

    // Morning shift (7 AM - 3 PM)
    shifts.push({
      careRecipientId: careRecipients[0].id,
      caregiverId: dayOffset % 2 === 0 ? users[1].id : users[2].id,
      startTime: setTime(shiftDate, 7, 0),
      endTime: setTime(shiftDate, 15, 0),
      status: dayOffset < 0 ? 'COMPLETED' : dayOffset === 0 ? 'IN_PROGRESS' : 'SCHEDULED',
      checkedInAt: dayOffset <= 0 ? setTime(shiftDate, 6, 55) : null,
      checkedOutAt: dayOffset < 0 ? setTime(shiftDate, 15, 5) : null,
      notes: 'Morning medication, breakfast, physical therapy exercises',
    });

    // Evening shift (3 PM - 11 PM)
    shifts.push({
      careRecipientId: careRecipients[0].id,
      caregiverId: dayOffset % 2 === 0 ? users[2].id : users[1].id,
      startTime: setTime(shiftDate, 15, 0),
      endTime: setTime(shiftDate, 23, 0),
      status: dayOffset < 0 ? 'COMPLETED' : 'SCHEDULED',
      checkedInAt: dayOffset < 0 ? setTime(shiftDate, 14, 58) : null,
      checkedOutAt: dayOffset < 0 ? setTime(shiftDate, 23, 2) : null,
      notes: 'Evening medication, dinner, bedtime routine',
    });
  }

  await prisma.caregiverShift.createMany({ data: shifts as any });
  console.log(`   ✅ Created ${shifts.length} caregiver shifts`);

  // ============================================
  // 11. CREATE TIMELINE ENTRIES
  // ============================================
  console.log('📋 Creating timeline entries...');

  const timelineEntries = await Promise.all([
    // Vitals entries
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[1].id,
        type: 'VITALS',
        title: 'Morning Vitals',
        description: 'All vitals within normal range',
        vitals: {
          bloodPressure: { systolic: 128, diastolic: 82 },
          heartRate: 72,
          temperature: 98.4,
          bloodSugar: 145,
          weight: 142,
          oxygenSaturation: 97,
        },
        occurredAt: setTime(addDays(today, -1), 8, 30),
      },
    }),
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[2].id,
        type: 'VITALS',
        title: 'Evening Vitals',
        description: 'Blood pressure slightly elevated',
        severity: 'LOW',
        vitals: {
          bloodPressure: { systolic: 142, diastolic: 88 },
          heartRate: 78,
          temperature: 98.6,
          bloodSugar: 165,
        },
        occurredAt: setTime(addDays(today, -1), 18, 0),
      },
    }),
    // Symptom entries
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[1].id,
        type: 'SYMPTOM',
        title: 'Mild Headache',
        description: 'Complained of mild headache after lunch. Resolved after rest.',
        severity: 'LOW',
        occurredAt: setTime(addDays(today, -2), 13, 30),
      },
    }),
    // Incident entry
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[2].id,
        type: 'INCIDENT',
        title: 'Near Fall in Bathroom',
        description: 'Almost lost balance getting out of shower. Caught herself on grab bar. No injury. Reminded to call for assistance.',
        severity: 'MEDIUM',
        occurredAt: setTime(addDays(today, -3), 9, 15),
      },
    }),
    // Mood entries
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[1].id,
        type: 'MOOD',
        title: 'Good Spirits Today',
        description: 'Very cheerful and talkative. Enjoyed video call with grandchildren.',
        occurredAt: setTime(today, 10, 0),
      },
    }),
    // Meal entries
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[2].id,
        type: 'MEAL',
        title: 'Lunch',
        description: 'Ate well - grilled chicken salad with water. Declined dessert.',
        occurredAt: setTime(today, 12, 30),
      },
    }),
    // Activity
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[1].id,
        type: 'ACTIVITY',
        title: 'Physical Therapy Exercises',
        description: 'Completed full session of PT exercises. Good range of motion today.',
        occurredAt: setTime(addDays(today, -1), 10, 0),
      },
    }),
    // Note
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[0].id,
        type: 'NOTE',
        title: 'Caregiver Handoff Notes',
        description: 'Evening meds given on time. Had difficulty sleeping last night - mentioned to night shift. Doctor appointment reminder for Thursday.',
        occurredAt: setTime(today, 15, 0),
      },
    }),
    // Robert's entries
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[1].id,
        createdById: users[1].id,
        type: 'VITALS',
        title: 'Morning Vitals',
        vitals: {
          bloodPressure: { systolic: 135, diastolic: 85 },
          heartRate: 68,
          oxygenSaturation: 94,
        },
        occurredAt: setTime(today, 8, 0),
      },
    }),
    // Eleanor's entries
    prisma.timelineEntry.create({
      data: {
        careRecipientId: careRecipients[2].id,
        createdById: users[4].id,
        type: 'SYMPTOM',
        title: 'Increased Tremors',
        description: 'Tremors more noticeable this morning before medication. Improved after Sinemet.',
        severity: 'MEDIUM',
        occurredAt: setTime(today, 7, 30),
      },
    }),
  ]);

  console.log(`   ✅ Created ${timelineEntries.length} timeline entries`);

  // ============================================
  // 12. CREATE DOCUMENTS
  // ============================================
  console.log('📄 Creating documents...');

  const documents = await Promise.all([
    prisma.document.create({
      data: {
        familyId: families[0].id,
        uploadedById: users[0].id,
        name: 'Insurance Card - BlueCross',
        type: 'INSURANCE_CARD',
        status: 'READY',
        mimeType: 'image/jpeg',
        sizeBytes: 245000,
        url: 'https://example.com/documents/insurance-card.jpg',
        notes: 'Front and back of card',
      },
    }),
    prisma.document.create({
      data: {
        familyId: families[0].id,
        uploadedById: users[0].id,
        name: 'Power of Attorney',
        type: 'POWER_OF_ATTORNEY',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 1250000,
        url: 'https://example.com/documents/poa.pdf',
        notes: 'Signed and notarized March 2024',
      },
    }),
    prisma.document.create({
      data: {
        familyId: families[0].id,
        uploadedById: users[0].id,
        name: 'Living Will',
        type: 'LIVING_WILL',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 890000,
        url: 'https://example.com/documents/living-will.pdf',
      },
    }),
    prisma.document.create({
      data: {
        familyId: families[0].id,
        uploadedById: users[0].id,
        name: 'Lab Results - January 2026',
        type: 'LAB_RESULT',
        status: 'READY',
        mimeType: 'application/pdf',
        sizeBytes: 450000,
        url: 'https://example.com/documents/lab-jan-2026.pdf',
        notes: 'A1C improved to 6.8%',
      },
    }),
    prisma.document.create({
      data: {
        familyId: families[0].id,
        uploadedById: users[0].id,
        name: 'Photo ID - Margaret',
        type: 'PHOTO_ID',
        status: 'READY',
        mimeType: 'image/jpeg',
        sizeBytes: 180000,
        url: 'https://example.com/documents/photo-id.jpg',
        expiresAt: new Date('2028-03-15'),
      },
    }),
  ]);

  console.log(`   ✅ Created ${documents.length} documents`);

  // ============================================
  // 13. CREATE NOTIFICATIONS
  // ============================================
  console.log('🔔 Creating notifications...');

  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'MEDICATION_REMINDER',
        title: 'Medication Reminder',
        body: "It's time for Margaret's evening medications (Donepezil 5mg)",
        data: { careRecipientId: careRecipients[0].id, medicationId: medications[2].id },
        read: true,
        readAt: addDays(today, -1),
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'APPOINTMENT_REMINDER',
        title: 'Upcoming Appointment',
        body: 'Diabetes Follow-up with Dr. Lee in 3 days',
        data: { careRecipientId: careRecipients[0].id, appointmentId: appointments[1].id },
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id,
        type: 'SHIFT_REMINDER',
        title: 'Shift Starting Soon',
        body: 'Your morning shift starts in 1 hour',
        data: { careRecipientId: careRecipients[0].id },
        read: true,
        readAt: today,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'REFILL_ALERT',
        title: 'Medication Refill Needed',
        body: 'Lisinopril is running low (28 remaining, refill at 7)',
        data: { careRecipientId: careRecipients[0].id, medicationId: medications[1].id },
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'TIMELINE_UPDATE',
        title: 'New Timeline Entry',
        body: 'Michael added vitals for Margaret',
        data: { careRecipientId: careRecipients[0].id },
        read: false,
      },
    }),
  ]);

  console.log(`   ✅ Created ${notifications.length} notifications`);

  // ============================================
  // 14. CREATE EMERGENCY ALERTS (resolved ones)
  // ============================================
  console.log('🚨 Creating emergency alert history...');

  const alerts = await Promise.all([
    prisma.emergencyAlert.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[2].id,
        type: 'FALL',
        title: 'Minor Fall in Bedroom',
        description: 'Found sitting on floor next to bed. No visible injuries. States she was trying to reach for her glasses.',
        location: 'Master bedroom',
        status: 'RESOLVED',
        resolvedAt: addDays(today, -5),
        resolvedById: users[0].id,
        resolutionNotes: 'Checked by Dr. Foster - no injuries. Added nightstand with better accessibility for glasses.',
      },
    }),
    prisma.emergencyAlert.create({
      data: {
        careRecipientId: careRecipients[0].id,
        createdById: users[1].id,
        type: 'MEDICAL',
        title: 'Blood Sugar Spike',
        description: 'Blood sugar reading of 285. Patient feeling shaky and confused.',
        status: 'RESOLVED',
        resolvedAt: addDays(today, -12),
        resolvedById: users[0].id,
        resolutionNotes: 'Given insulin per Dr. Lee protocol. Blood sugar normalized within 2 hours. Confirmed ate extra dessert at lunch.',
      },
    }),
  ]);

  console.log(`   ✅ Created ${alerts.length} emergency alerts`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Users: ${users.length}`);
  console.log(`   • Families: ${families.length}`);
  console.log(`   • Care Recipients: ${careRecipients.length}`);
  console.log(`   • Doctors: ${doctors.length}`);
  console.log(`   • Medications: ${medications.length}`);
  console.log(`   • Medication Logs: ${logEntries.length}`);
  console.log(`   • Appointments: ${appointments.length}`);
  console.log(`   • Caregiver Shifts: ${shifts.length}`);
  console.log(`   • Timeline Entries: ${timelineEntries.length}`);
  console.log(`   • Documents: ${documents.length}`);
  console.log(`   • Notifications: ${notifications.length}`);
  console.log(`   • Emergency Alerts: ${alerts.length}`);

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        🔐 QUICK LOGIN REFERENCE                           ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  PASSWORD FOR ALL USERS: Test1234!                                        ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  EMAIL                        │ NAME            │ ROLE     │ FAMILY       ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  admin@carecircle.com         │ Sarah Johnson   │ ADMIN    │ Johnson      ║');
  console.log('║  caregiver1@carecircle.com    │ Michael Chen    │ CAREGIVER│ Johnson      ║');
  console.log('║  caregiver2@carecircle.com    │ Emily Rodriguez │ CAREGIVER│ Johnson      ║');
  console.log('║  viewer@carecircle.com        │ David Thompson  │ VIEWER   │ Johnson      ║');
  console.log('║  admin2@carecircle.com        │ Jennifer Williams│ ADMIN   │ Williams     ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  CARE RECIPIENTS:                                                         ║');
  console.log('║  • Margaret Johnson (Grandma Maggie) - Diabetes, Dementia [Johnson]       ║');
  console.log('║  • Robert Johnson (Grandpa Bob) - COPD, AFib [Johnson]                    ║');
  console.log('║  • Eleanor Williams (Ellie) - Parkinsons, Anxiety [Williams]              ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  FEATURES TO TEST:                                                        ║');
  console.log('║  ✓ Login/Logout  ✓ Medications  ✓ Appointments  ✓ Timeline  ✓ Documents   ║');
  console.log('║  ✓ Family Chat   ✓ Shifts       ✓ Emergency     ✓ Vitals    ✓ Notifs      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
