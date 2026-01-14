import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Security Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Create test user
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'security@example.com',
        password: 'SecurePassword123!',
        fullName: 'Security Test User',
      });

    userId = registerRes.body.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'security@example.com',
        password: 'SecurePassword123!',
      });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: "admin@example.com' OR '1'='1",
          password: "password' OR '1'='1",
        })
        .expect(401);
    });

    it('should prevent SQL injection in search parameters', () => {
      return request(app.getHttpServer())
        .get("/users?search=' OR '1'='1")
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => {
          expect(res.status).not.toBe(500); // Should not crash
        });
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize XSS attempts in user input', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const familyRes = await request(app.getHttpServer())
        .post('/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: xssPayload,
        });

      // Should either sanitize or reject
      expect(familyRes.body.name).not.toContain('<script>');
    });

    it('should prevent XSS in markdown content', async () => {
      const xssMarkdown = '[Click me](javascript:alert("XSS"))';

      // Attempt to create timeline entry with XSS
      const response = await request(app.getHttpServer())
        .post('/timeline')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          careRecipientId: 'test-id',
          type: 'NOTE',
          title: 'Test',
          description: xssMarkdown,
        });

      // Should not contain javascript protocol
      if (response.body.description) {
        expect(response.body.description).not.toContain('javascript:');
      }
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject requests with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should reject requests with expired token', async () => {
      // This would need a way to generate expired tokens
      // For now, test with malformed token
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired')
        .expect(401);
    });

    it('should prevent user from accessing other users data', async () => {
      // Create another user
      const otherUserRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'SecurePassword123!',
          fullName: 'Other User',
        });

      const otherUserId = otherUserRes.body.id;

      // Try to access other user's data
      const response = await request(app.getHttpServer())
        .get(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Should either 403 (Forbidden) or 404 (Not Found)
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      const requests = [];

      // Make 20 rapid login attempts
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'rate-limit@example.com',
              password: 'WrongPassword123!',
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited (429)
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Password Security', () => {
    it('should reject weak passwords', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weak@example.com',
          password: '12345',
          fullName: 'Weak Password User',
        })
        .expect(400);
    });

    it('should not return password in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('password');
    });

    it('should hash passwords', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Password should not be stored in plain text
      expect(user?.password).not.toBe('SecurePassword123!');
      expect(user?.password?.length).toBeGreaterThan(20); // Hashed password is long
    });
  });

  describe('CORS Protection', () => {
    it('should have CORS headers', () => {
      return request(app.getHttpServer())
        .options('/auth/login')
        .expect((res) => {
          expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    it('should restrict CORS to allowed origins', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Origin', 'https://malicious-site.com')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => {
          // Should either reject or not include CORS headers for untrusted origin
          if (res.headers['access-control-allow-origin']) {
            expect(res.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
          }
        });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePassword123!',
          fullName: 'Test User',
        })
        .expect(400);
    });

    it('should reject excessively long inputs', () => {
      const longString = 'a'.repeat(10000);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          fullName: longString,
        })
        .expect(400);
    });

    it('should reject invalid data types', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 123, // Should be string
          password: 'SecurePassword123!',
          fullName: 'Test User',
        })
        .expect(400);
    });
  });

  describe('Security Headers', () => {
    it('should have security headers set', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => {
          // Helmet should set these headers
          expect(res.headers['x-frame-options']).toBeDefined();
          expect(res.headers['x-content-type-options']).toBe('nosniff');
          expect(res.headers['x-xss-protection']).toBeDefined();
        });
    });

    it('should not expose sensitive information in headers', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res) => {
          // Should not expose server technology
          expect(res.headers['x-powered-by']).toBeUndefined();
        });
    });
  });

  describe('Session Security', () => {
    it('should invalidate old refresh token after refresh', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'security@example.com',
          password: 'SecurePassword123!',
        });

      const oldRefreshToken = loginRes.body.refreshToken;

      // Refresh token
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      const newRefreshToken = refreshRes.body.refreshToken;

      // Old token should not work anymore
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });

    it('should invalidate all sessions on logout', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'security@example.com',
          password: 'SecurePassword123!',
        });

      const token = loginRes.body.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Refresh token should not work after logout
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(401);
    });
  });

  describe('File Upload Security', () => {
    it('should reject files that are too large', async () => {
      // This would need actual file upload capability
      // Placeholder test
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const response = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', largeBuffer, 'large-file.pdf');

      // Should reject or handle gracefully
      expect([400, 413, 500]).toContain(response.status);
    });

    it('should validate file types', async () => {
      // Test executable file upload
      const executableBuffer = Buffer.from('MZ'); // PE executable header

      const response = await request(app.getHttpServer())
        .post('/documents/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', executableBuffer, 'malicious.exe');

      // Should reject executable files
      expect([400, 415]).toContain(response.status);
    });
  });
});
