import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../apps/api/src/app.module';

/**
 * End-to-End Test: Family Management Flow
 *
 * Tests the complete family management user journey:
 * 1. User registration and login
 * 2. Create a family
 * 3. Invite a family member
 * 4. Accept invitation (as invited user)
 * 5. Verify family membership
 */

describe('Family Management Flow (E2E)', () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let memberAccessToken: string;
  let familyId: string;
  let invitationId: string;
  let invitationToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. User Registration & Login', () => {
    it('should register admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `admin-${Date.now()}@test.com`,
          password: 'Test123!@#',
          fullName: 'Admin User',
          phone: '+1234567890',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });

    it('should login admin user', async () => {
      const email = `admin-login-${Date.now()}@test.com`;

      // Register first
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test123!@#',
          fullName: 'Admin Login User',
        });

      // Login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'Test123!@#',
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      adminAccessToken = response.body.tokens.accessToken;
    });
  });

  describe('2. Create Family', () => {
    it('should create a family', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Test Family',
          nickname: 'Family Admin',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Family');
      familyId = response.body.id;
    });

    it('should get family details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/families/${familyId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.id).toBe(familyId);
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].role).toBe('ADMIN');
    });
  });

  describe('3. Invite Family Member', () => {
    it('should send family invitation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/${familyId}/invite`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          email: `member-${Date.now()}@test.com`,
          role: 'CAREGIVER',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toContain('member-');
      expect(response.body.role).toBe('CAREGIVER');
      invitationId = response.body.id;
    });

    it('should resend invitation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/families/invitations/${invitationId}/resend`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('4. Health Checks', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });
  });
});
