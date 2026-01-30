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

describe('MedicationsController (e2e)', () => {
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

  describe('POST /care-recipients/:id/medications', () => {
    it('should create a new medication', async () => {
      const medicationData = {
        name: 'Metformin',
        dosage: '500mg',
        form: 'TABLET',
        frequency: 'TWICE_DAILY',
        timesPerDay: 2,
        scheduledTimes: ['08:00', '20:00'],
        instructions: 'Take with food',
      };

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(medicationData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Metformin');
      expect(res.body.dosage).toBe('500mg');
      expect(res.body.form).toBe('TABLET');
      expect(res.body.frequency).toBe('TWICE_DAILY');
      expect(res.body.isActive).toBe(true);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .send({
          name: 'Test Med',
          dosage: '10mg',
          form: 'TABLET',
          frequency: 'DAILY',
        })
        .expect(401);
    });

    it('should fail with invalid data', () => {
      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          name: '', // Empty name
          dosage: '10mg',
        })
        .expect(400);
    });
  });

  describe('GET /care-recipients/:id/medications', () => {
    let medicationId: string;

    beforeEach(async () => {
      // Create a test medication
      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          name: 'Lisinopril',
          dosage: '10mg',
          form: 'TABLET',
          frequency: 'DAILY',
          timesPerDay: 1,
          scheduledTimes: ['09:00'],
        });

      medicationId = res.body.id;
    });

    it('should return all medications for care recipient', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('name');
    });

    it('should get a single medication by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/medications/${medicationId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(medicationId);
      expect(res.body.name).toBe('Lisinopril');
    });
  });

  describe('PATCH /care-recipients/:id/medications/:medicationId', () => {
    let medicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          name: 'Aspirin',
          dosage: '81mg',
          form: 'TABLET',
          frequency: 'DAILY',
        });

      medicationId = res.body.id;
    });

    it('should update a medication', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/care-recipients/${careRecipient.id}/medications/${medicationId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          dosage: '325mg',
          instructions: 'Take with water',
        })
        .expect(200);

      expect(res.body.dosage).toBe('325mg');
      expect(res.body.instructions).toBe('Take with water');
    });
  });

  describe('POST /care-recipients/:id/medications/:medicationId/log', () => {
    let medicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          name: 'Test Med',
          dosage: '50mg',
          form: 'CAPSULE',
          frequency: 'DAILY',
          scheduledTimes: ['10:00'],
        });

      medicationId = res.body.id;
    });

    it('should log medication as given', async () => {
      const scheduledTime = new Date();
      scheduledTime.setHours(10, 0, 0, 0);

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          scheduledTime: scheduledTime.toISOString(),
          status: 'GIVEN',
          notes: 'Taken with breakfast',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('GIVEN');
    });

    it('should log medication as skipped with reason', async () => {
      const scheduledTime = new Date();
      scheduledTime.setHours(10, 0, 0, 0);

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          scheduledTime: scheduledTime.toISOString(),
          status: 'SKIPPED',
          skipReason: 'Patient refused',
        })
        .expect(201);

      expect(res.body.status).toBe('SKIPPED');
      expect(res.body.skipReason).toBe('Patient refused');
    });
  });

  describe('PATCH /care-recipients/:id/medications/:medicationId/deactivate', () => {
    let medicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/medications`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          name: 'Deactivate Test',
          dosage: '25mg',
          form: 'TABLET',
          frequency: 'DAILY',
        });

      medicationId = res.body.id;
    });

    it('should deactivate a medication', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/care-recipients/${careRecipient.id}/medications/${medicationId}/deactivate`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });
  });
});

