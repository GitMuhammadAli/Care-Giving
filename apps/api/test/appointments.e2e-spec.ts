import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  TestUser,
  TestCareRecipient,
  createTestUser,
  createTestFamily,
  createTestCareRecipient,
  cleanupTestData,
} from './helpers/test-helpers';

describe('AppointmentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: TestUser;
  let careRecipient: TestCareRecipient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);

    // Create test user with family and care recipient
    testUser = await createTestUser(app);
    const family = await createTestFamily(app, testUser.accessToken);
    careRecipient = await createTestCareRecipient(app, testUser.accessToken, family.id);
  });

  describe('POST /care-recipients/:id/appointments', () => {
    it('should create a new appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(11, 0, 0, 0);

      const appointmentData = {
        title: 'Annual Checkup',
        type: 'DOCTOR_VISIT',
        startTime: tomorrow.toISOString(),
        endTime: endTime.toISOString(),
        location: 'City Medical Center',
        address: '123 Health St',
        notes: 'Bring medication list',
      };

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(appointmentData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Annual Checkup');
      expect(res.body.type).toBe('DOCTOR_VISIT');
      expect(res.body.status).toBe('SCHEDULED');
    });

    it('should fail without authentication', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .send({
          title: 'Test Appointment',
          type: 'DOCTOR_VISIT',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        })
        .expect(401);
    });

    it('should fail with invalid type', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Test',
          type: 'INVALID_TYPE',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        })
        .expect(400);
    });
  });

  describe('GET /care-recipients/:id/appointments', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Physical Therapy',
          type: 'PHYSICAL_THERAPY',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        });

      appointmentId = res.body.id;
    });

    it('should return all appointments for care recipient', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should get a single appointment by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(appointmentId);
      expect(res.body.title).toBe('Physical Therapy');
    });

    it('should filter appointments by date range', async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .query({
          startDate: today.toISOString(),
          endDate: nextWeek.toISOString(),
        })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /care-recipients/:id/appointments/upcoming', () => {
    beforeEach(async () => {
      // Create multiple appointments
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Upcoming 1',
          type: 'DOCTOR_VISIT',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        });

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Upcoming 2',
          type: 'LAB_WORK',
          startTime: nextWeek.toISOString(),
          endTime: new Date(nextWeek.getTime() + 3600000).toISOString(),
        });
    });

    it('should return upcoming appointments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/appointments/upcoming`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /care-recipients/:id/appointments/:appointmentId', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Update Test',
          type: 'DOCTOR_VISIT',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        });

      appointmentId = res.body.id;
    });

    it('should update an appointment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/care-recipients/${careRecipient.id}/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Updated Title',
          location: 'New Location',
          notes: 'Updated notes',
        })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.location).toBe('New Location');
    });

    it('should update appointment status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/care-recipients/${careRecipient.id}/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          status: 'CONFIRMED',
        })
        .expect(200);

      expect(res.body.status).toBe('CONFIRMED');
    });
  });

  describe('DELETE /care-recipients/:id/appointments/:appointmentId', () => {
    let appointmentId: string;

    beforeEach(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Delete Test',
          type: 'DOCTOR_VISIT',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        });

      appointmentId = res.body.id;
    });

    it('should delete an appointment', async () => {
      await request(app.getHttpServer())
        .delete(`/care-recipients/${careRecipient.id}/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(404);
    });
  });

  describe('POST /care-recipients/:id/appointments/recurring', () => {
    it('should create a recurring appointment series', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/appointments/recurring`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .query({ maxOccurrences: '4' })
        .send({
          title: 'Weekly Therapy',
          type: 'PHYSICAL_THERAPY',
          startTime: tomorrow.toISOString(),
          endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
          isRecurring: true,
          recurrenceRule: 'FREQ=WEEKLY',
        })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
      expect(res.body[0].isRecurring).toBe(true);
    });
  });
});

