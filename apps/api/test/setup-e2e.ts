// Setup file for E2E tests
// This runs before all E2E tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/carecircle_test';
process.env.JWT_SECRET = 'test_jwt_secret_min_32_characters_long_for_security';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_min_32_characters_long';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for E2E tests
jest.setTimeout(30000);
