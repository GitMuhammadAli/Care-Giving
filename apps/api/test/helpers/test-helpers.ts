import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';

export interface TestUser {
  id: string;
  email: string;
  fullName: string;
  accessToken: string;
  refreshToken: string;
}

export interface TestFamily {
  id: string;
  name: string;
}

export interface TestCareRecipient {
  id: string;
  fullName: string;
  familyId: string;
}

/**
 * Create a test user and get auth tokens
 */
export async function createTestUser(
  app: INestApplication,
  overrides: Partial<{ email: string; password: string; fullName: string }> = {},
): Promise<TestUser> {
  const userData = {
    email: overrides.email || `test-${Date.now()}@example.com`,
    password: overrides.password || 'SecurePassword123!',
    fullName: overrides.fullName || 'Test User',
  };

  // Register
  const registerRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send(userData)
    .expect(201);

  // Login
  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: userData.email,
      password: userData.password,
    })
    .expect(200);

  return {
    id: registerRes.body.id,
    email: userData.email,
    fullName: userData.fullName,
    accessToken: loginRes.body.accessToken,
    refreshToken: loginRes.body.refreshToken,
  };
}

/**
 * Create a test family for a user
 */
export async function createTestFamily(
  app: INestApplication,
  accessToken: string,
  name: string = 'Test Family',
): Promise<TestFamily> {
  const res = await request(app.getHttpServer())
    .post('/families')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name })
    .expect(201);

  return {
    id: res.body.id,
    name: res.body.name,
  };
}

/**
 * Create a test care recipient
 */
export async function createTestCareRecipient(
  app: INestApplication,
  accessToken: string,
  familyId: string,
  overrides: Partial<{ fullName: string; preferredName: string; dateOfBirth: string }> = {},
): Promise<TestCareRecipient> {
  const careRecipientData = {
    fullName: overrides.fullName || 'Test Care Recipient',
    preferredName: overrides.preferredName || 'Grandma',
    dateOfBirth: overrides.dateOfBirth || '1945-05-15',
  };

  const res = await request(app.getHttpServer())
    .post(`/families/${familyId}/care-recipients`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(careRecipientData)
    .expect(201);

  return {
    id: res.body.id,
    fullName: res.body.fullName,
    familyId: res.body.familyId,
  };
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(prisma: PrismaService): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.medicationLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emergencyAlert.deleteMany();
  await prisma.timelineEntry.deleteMany();
  await prisma.caregiverShift.deleteMany();
  await prisma.transportAssignment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.document.deleteMany();
  await prisma.careRecipient.deleteMany();
  await prisma.familyInvitation.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

