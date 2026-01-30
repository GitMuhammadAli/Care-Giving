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

describe('EmergencyController (e2e)', () => {
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

  describe('GET /care-recipients/:id/emergency/info', () => {
    it('should return emergency info for care recipient', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/emergency/info`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('careRecipient');
      expect(res.body).toHaveProperty('emergencyContacts');
      expect(res.body).toHaveProperty('medications');
      expect(res.body).toHaveProperty('doctors');
      expect(res.body.careRecipient.id).toBe(careRecipient.id);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/emergency/info`)
        .expect(401);
    });
  });

  describe('POST /care-recipients/:id/emergency/alerts', () => {
    it('should create an emergency alert', async () => {
      const alertData = {
        type: 'FALL',
        title: 'Patient fell in bathroom',
        description: 'Patient slipped and fell while getting out of shower',
        location: 'Bathroom - Home',
      };

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(alertData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('FALL');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.title).toBe('Patient fell in bathroom');
    });

    it('should create a medical emergency alert', async () => {
      const alertData = {
        type: 'MEDICAL',
        title: 'Chest pain',
        description: 'Patient complaining of severe chest pain and shortness of breath',
        location: 'Living room',
      };

      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(alertData)
        .expect(201);

      expect(res.body.type).toBe('MEDICAL');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('should fail without required fields', () => {
      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'FALL',
          // Missing title and description
        })
        .expect(400);
    });

    it('should fail with invalid emergency type', () => {
      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'INVALID_TYPE',
          title: 'Test',
          description: 'Test description',
        })
        .expect(400);
    });
  });

  describe('GET /care-recipients/:id/emergency/alerts', () => {
    beforeEach(async () => {
      // Create a test alert
      await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'FALL',
          title: 'Test fall',
          description: 'Test fall description',
        });
    });

    it('should return active alerts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].status).toBe('ACTIVE');
    });
  });

  describe('GET /care-recipients/:id/emergency/alerts/history', () => {
    beforeEach(async () => {
      // Create and resolve an alert
      const alertRes = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'FALL',
          title: 'Historical alert',
          description: 'This will be resolved',
        });

      await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts/${alertRes.body.id}/resolve`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          resolutionNotes: 'Patient was fine, just tripped',
        });
    });

    it('should return alert history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/emergency/alerts/history`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should support limit parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/care-recipients/${careRecipient.id}/emergency/alerts/history`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .query({ limit: '5' })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /care-recipients/:id/emergency/alerts/:alertId/acknowledge', () => {
    let alertId: string;

    beforeEach(async () => {
      const alertRes = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'MEDICAL',
          title: 'Acknowledge test',
          description: 'Test alert for acknowledgement',
        });

      alertId = alertRes.body.id;
    });

    it('should acknowledge an alert', async () => {
      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('ACKNOWLEDGED');
    });
  });

  describe('POST /care-recipients/:id/emergency/alerts/:alertId/resolve', () => {
    let alertId: string;

    beforeEach(async () => {
      const alertRes = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'FALL',
          title: 'Resolve test',
          description: 'Test alert for resolution',
        });

      alertId = alertRes.body.id;
    });

    it('should resolve an alert with resolution notes', async () => {
      const res = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          resolutionNotes: 'Patient is okay, minor bruise, ice applied',
        })
        .expect(200);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.resolutionNotes).toBe('Patient is okay, minor bruise, ice applied');
      expect(res.body).toHaveProperty('resolvedAt');
    });

    it('should fail without resolution notes', () => {
      return request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Emergency alert workflow', () => {
    it('should complete full emergency workflow: create -> acknowledge -> resolve', async () => {
      // Step 1: Create alert
      const createRes = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          type: 'HOSPITALIZATION',
          title: 'Emergency room visit',
          description: 'Patient taken to ER due to difficulty breathing',
          location: 'City Hospital ER',
        })
        .expect(201);

      const alertId = createRes.body.id;
      expect(createRes.body.status).toBe('ACTIVE');

      // Step 2: Acknowledge alert
      const ackRes = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      expect(ackRes.body.status).toBe('ACKNOWLEDGED');

      // Step 3: Resolve alert
      const resolveRes = await request(app.getHttpServer())
        .post(`/care-recipients/${careRecipient.id}/emergency/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          resolutionNotes: 'Patient discharged after treatment. Prescribed antibiotics for respiratory infection.',
        })
        .expect(200);

      expect(resolveRes.body.status).toBe('RESOLVED');
      expect(resolveRes.body).toHaveProperty('resolvedAt');
    });
  });
});

