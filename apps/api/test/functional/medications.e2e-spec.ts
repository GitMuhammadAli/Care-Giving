import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Medications API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let careRecipientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Setup: Create test user and care recipient
    await prisma.user.deleteMany();
    await prisma.family.deleteMany();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'medtest@example.com',
        password: 'SecurePassword123!',
        fullName: 'Medication Test User',
      });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'medtest@example.com',
        password: 'SecurePassword123!',
      });

    accessToken = loginRes.body.accessToken;

    // Create family and care recipient
    const familyRes = await request(app.getHttpServer())
      .post('/families')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Family',
      });

    const careRecipientRes = await request(app.getHttpServer())
      .post('/care-recipients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        familyId: familyRes.body.id,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1950-01-01',
      });

    careRecipientId = careRecipientRes.body.id;
  });

  afterAll(async () => {
    await prisma.medication.deleteMany();
    await prisma.careRecipient.deleteMany();
    await prisma.family.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /medications', () => {
    it('should create a new medication', () => {
      return request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Aspirin',
          dosage: '100mg',
          form: 'TABLET',
          frequency: 'ONCE_DAILY',
          times: ['08:00'],
          instructions: 'Take with food',
          startDate: new Date().toISOString(),
          currentSupply: 30,
          refillThreshold: 7,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Aspirin');
          expect(res.body.dosage).toBe('100mg');
          expect(res.body.careRecipientId).toBe(careRecipientId);
        });
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Invalid Med',
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate medication times match frequency', () => {
      return request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Test Med',
          dosage: '50mg',
          form: 'TABLET',
          frequency: 'TWICE_DAILY',
          times: ['08:00'], // Should have 2 times
          startDate: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('GET /medications', () => {
    let medicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Test Medication',
          dosage: '50mg',
          form: 'TABLET',
          frequency: 'ONCE_DAILY',
          times: ['08:00'],
          startDate: new Date().toISOString(),
          currentSupply: 30,
        });
      medicationId = res.body.id;
    });

    it('should get all medications for care recipient', () => {
      return request(app.getHttpServer())
        .get(`/medications?careRecipientId=${careRecipientId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should get medication by id', () => {
      return request(app.getHttpServer())
        .get(`/medications/${medicationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(medicationId);
          expect(res.body.name).toBe('Test Medication');
        });
    });

    it('should return 404 for non-existent medication', () => {
      return request(app.getHttpServer())
        .get('/medications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /medications/:id', () => {
    let medicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Updatable Med',
          dosage: '50mg',
          form: 'TABLET',
          frequency: 'ONCE_DAILY',
          times: ['08:00'],
          startDate: new Date().toISOString(),
          currentSupply: 30,
        });
      medicationId = res.body.id;
    });

    it('should update medication', () => {
      return request(app.getHttpServer())
        .patch(`/medications/${medicationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dosage: '100mg',
          currentSupply: 25,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.dosage).toBe('100mg');
          expect(res.body.currentSupply).toBe(25);
        });
    });

    it('should not update with invalid data', () => {
      return request(app.getHttpServer())
        .patch(`/medications/${medicationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dosage: '', // Invalid empty dosage
        })
        .expect(400);
    });
  });

  describe('POST /medications/:id/log', () => {
    let medicationId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Loggable Med',
          dosage: '50mg',
          form: 'TABLET',
          frequency: 'ONCE_DAILY',
          times: ['08:00'],
          startDate: new Date().toISOString(),
          currentSupply: 30,
        });
      medicationId = res.body.id;
    });

    it('should log medication as taken', () => {
      return request(app.getHttpServer())
        .post(`/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'TAKEN',
          takenAt: new Date().toISOString(),
          scheduledTime: new Date().toISOString(),
          notes: 'Taken with breakfast',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('TAKEN');
          expect(res.body.medicationId).toBe(medicationId);
        });
    });

    it('should log medication as missed', () => {
      return request(app.getHttpServer())
        .post(`/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'MISSED',
          scheduledTime: new Date().toISOString(),
          notes: 'Patient was sleeping',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('MISSED');
        });
    });

    it('should validate status field', () => {
      return request(app.getHttpServer())
        .post(`/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'INVALID_STATUS',
          scheduledTime: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('GET /medications/:id/logs', () => {
    let medicationId: string;

    beforeEach(async () => {
      const medRes = await request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Logged Med',
          dosage: '50mg',
          form: 'TABLET',
          frequency: 'ONCE_DAILY',
          times: ['08:00'],
          startDate: new Date().toISOString(),
          currentSupply: 30,
        });
      medicationId = medRes.body.id;

      // Create some logs
      await request(app.getHttpServer())
        .post(`/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'TAKEN',
          takenAt: new Date().toISOString(),
          scheduledTime: new Date().toISOString(),
        });

      await request(app.getHttpServer())
        .post(`/medications/${medicationId}/log`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'TAKEN',
          takenAt: new Date().toISOString(),
          scheduledTime: new Date().toISOString(),
        });
    });

    it('should get medication logs', () => {
      return request(app.getHttpServer())
        .get(`/medications/${medicationId}/logs`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should limit logs by days parameter', () => {
      return request(app.getHttpServer())
        .get(`/medications/${medicationId}/logs?days=1`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('DELETE /medications/:id', () => {
    it('should delete medication', async () => {
      const medRes = await request(app.getHttpServer())
        .post('/medications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId,
          name: 'Deletable Med',
          dosage: '50mg',
          form: 'TABLET',
          frequency: 'ONCE_DAILY',
          times: ['08:00'],
          startDate: new Date().toISOString(),
          currentSupply: 30,
        });

      const medicationId = medRes.body.id;

      await request(app.getHttpServer())
        .delete(`/medications/${medicationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      return request(app.getHttpServer())
        .get(`/medications/${medicationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('GET /medications/upcoming', () => {
    it('should get upcoming medications for care recipient', () => {
      return request(app.getHttpServer())
        .get(`/medications/upcoming?careRecipientId=${careRecipientId}&hours=24`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
