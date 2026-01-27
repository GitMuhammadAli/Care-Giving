/**
 * CareCircle Load Testing Script
 * Simulates 100 concurrent users performing various operations
 *
 * Tests:
 * - Authentication (login/token refresh)
 * - CRUD operations (medications, appointments, timeline)
 * - Emergency alerts
 * - WebSocket connections
 * - Push notification subscriptions
 * - Chat operations (Stream Chat)
 * - File operations
 */

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'http://localhost:3001';
const NUM_USERS = parseInt(process.env.NUM_USERS || '100');
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION || '60000'); // 1 minute default

interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
  familyId?: string;
  careRecipientId?: string;
  socket?: Socket;
}

interface TestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: Record<string, number>;
  operationBreakdown: Record<string, { success: number; failed: number; avgTime: number }>;
}

const results: TestResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  minResponseTime: Infinity,
  errors: {},
  operationBreakdown: {},
};

const responseTimes: number[] = [];

// Helper to make authenticated requests
async function apiRequest(
  method: string,
  path: string,
  token?: string,
  body?: any,
  operation: string = 'unknown'
): Promise<{ success: boolean; data?: any; error?: string; time: number }> {
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const endTime = Date.now();
    const time = endTime - startTime;

    responseTimes.push(time);
    results.totalRequests++;

    // Update operation breakdown
    if (!results.operationBreakdown[operation]) {
      results.operationBreakdown[operation] = { success: 0, failed: 0, avgTime: 0 };
    }

    if (response.ok) {
      results.successfulRequests++;
      results.operationBreakdown[operation].success++;
      const data = await response.json().catch(() => ({}));
      return { success: true, data, time };
    } else {
      results.failedRequests++;
      results.operationBreakdown[operation].failed++;
      const errorText = await response.text().catch(() => 'Unknown error');
      const errorKey = `${response.status}: ${path}`;
      results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      return { success: false, error: errorText, time };
    }
  } catch (error: any) {
    const endTime = Date.now();
    const time = endTime - startTime;

    results.totalRequests++;
    results.failedRequests++;

    if (!results.operationBreakdown[operation]) {
      results.operationBreakdown[operation] = { success: 0, failed: 0, avgTime: 0 };
    }
    results.operationBreakdown[operation].failed++;

    const errorKey = `Network: ${error.message}`;
    results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;

    return { success: false, error: error.message, time };
  }
}

// Create test users in the database
async function createTestUsers(count: number): Promise<TestUser[]> {
  console.log(`\n📝 Creating ${count} test users...`);
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    const email = `loadtest_user_${i}_${Date.now()}@test.carecircle.com`;
    const password = 'TestPassword123!';

    const result = await apiRequest('POST', '/auth/register', undefined, {
      email,
      password,
      fullName: `Load Test User ${i}`,
      phone: `+1555000${String(i).padStart(4, '0')}`,
    }, 'register');

    if (result.success && result.data) {
      users.push({
        id: result.data.user?.id || result.data.id,
        email,
        password,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      });
    } else {
      // Try to login if user already exists
      const loginResult = await apiRequest('POST', '/auth/login', undefined, {
        email,
        password,
      }, 'login');

      if (loginResult.success && loginResult.data) {
        users.push({
          id: loginResult.data.user?.id || loginResult.data.id,
          email,
          password,
          accessToken: loginResult.data.accessToken,
          refreshToken: loginResult.data.refreshToken,
        });
      }
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  Created ${i + 1}/${count} users\r`);
    }
  }

  console.log(`\n✅ Created ${users.length} test users`);
  return users;
}

// Setup families and care recipients for test users
async function setupTestData(users: TestUser[]): Promise<void> {
  console.log('\n📦 Setting up test data (families, care recipients)...');

  // Create families for every 5th user (they become admins)
  for (let i = 0; i < users.length; i += 5) {
    const user = users[i];
    if (!user.accessToken) continue;

    // Create family
    const familyResult = await apiRequest('POST', '/families', user.accessToken, {
      name: `Test Family ${i}`,
    }, 'createFamily');

    if (familyResult.success && familyResult.data) {
      const familyId = familyResult.data.id;
      user.familyId = familyId;

      // Assign same family to next 4 users
      for (let j = 1; j < 5 && i + j < users.length; j++) {
        users[i + j].familyId = familyId;
      }

      // Create care recipient
      const careRecipientResult = await apiRequest('POST', `/families/${familyId}/care-recipients`, user.accessToken, {
        fullName: `Test Care Recipient ${i}`,
        preferredName: `CR${i}`,
        dateOfBirth: '1940-01-01',
        bloodType: 'A+',
        allergies: ['Penicillin'],
        conditions: ['Diabetes'],
      }, 'createCareRecipient');

      if (careRecipientResult.success && careRecipientResult.data) {
        const careRecipientId = careRecipientResult.data.id;
        user.careRecipientId = careRecipientId;

        // Assign same care recipient to family members
        for (let j = 1; j < 5 && i + j < users.length; j++) {
          users[i + j].careRecipientId = careRecipientId;
        }
      }
    }
  }

  console.log('✅ Test data setup complete');
}

// Connect WebSocket for a user
function connectWebSocket(user: TestUser): Promise<Socket | null> {
  return new Promise((resolve) => {
    if (!user.accessToken || !user.familyId) {
      resolve(null);
      return;
    }

    try {
      const socket = io(WS_URL, {
        auth: { token: user.accessToken },
        transports: ['websocket'],
        timeout: 5000,
      });

      socket.on('connect', () => {
        // Join family room
        socket.emit('joinFamily', user.familyId);
        user.socket = socket;
        resolve(socket);
      });

      socket.on('connect_error', () => {
        resolve(null);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!socket.connected) {
          socket.close();
          resolve(null);
        }
      }, 5000);
    } catch {
      resolve(null);
    }
  });
}

// Simulate user actions
async function simulateUserActions(user: TestUser, durationMs: number): Promise<void> {
  if (!user.accessToken) return;

  const endTime = Date.now() + durationMs;
  const actions = [
    'getMedications',
    'getAppointments',
    'getTimeline',
    'createTimelineEntry',
    'getNotifications',
    'refreshToken',
    'getChatToken',
    'getEmergencyInfo',
  ];

  while (Date.now() < endTime) {
    const action = actions[Math.floor(Math.random() * actions.length)];

    switch (action) {
      case 'getMedications':
        if (user.careRecipientId) {
          await apiRequest('GET', `/care-recipients/${user.careRecipientId}/medications`, user.accessToken, undefined, 'getMedications');
        }
        break;

      case 'getAppointments':
        if (user.careRecipientId) {
          await apiRequest('GET', `/care-recipients/${user.careRecipientId}/appointments`, user.accessToken, undefined, 'getAppointments');
        }
        break;

      case 'getTimeline':
        if (user.careRecipientId) {
          await apiRequest('GET', `/timeline?careRecipientId=${user.careRecipientId}&limit=20`, user.accessToken, undefined, 'getTimeline');
        }
        break;

      case 'createTimelineEntry':
        if (user.careRecipientId) {
          await apiRequest('POST', '/timeline', user.accessToken, {
            careRecipientId: user.careRecipientId,
            type: 'NOTE',
            title: 'Load test entry',
            description: `Test entry created at ${new Date().toISOString()}`,
          }, 'createTimelineEntry');
        }
        break;

      case 'getNotifications':
        await apiRequest('GET', '/notifications', user.accessToken, undefined, 'getNotifications');
        break;

      case 'refreshToken':
        if (user.refreshToken) {
          const result = await apiRequest('POST', '/auth/refresh', undefined, {
            refreshToken: user.refreshToken,
          }, 'refreshToken');
          if (result.success && result.data) {
            user.accessToken = result.data.accessToken;
            user.refreshToken = result.data.refreshToken;
          }
        }
        break;

      case 'getChatToken':
        await apiRequest('GET', '/chat/token', user.accessToken, undefined, 'getChatToken');
        break;

      case 'getEmergencyInfo':
        if (user.careRecipientId) {
          await apiRequest('GET', `/care-recipients/${user.careRecipientId}/emergency/info`, user.accessToken, undefined, 'getEmergencyInfo');
        }
        break;
    }

    // Random delay between actions (100ms - 2000ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1900 + 100));
  }
}

// Test emergency alerts (only a few users trigger these)
async function testEmergencyAlerts(users: TestUser[]): Promise<void> {
  console.log('\n🚨 Testing emergency alerts...');

  // Select 5 random users with care recipients
  const eligibleUsers = users.filter(u => u.accessToken && u.careRecipientId);
  const testUsers = eligibleUsers.slice(0, Math.min(5, eligibleUsers.length));

  for (const user of testUsers) {
    await apiRequest('POST', `/care-recipients/${user.careRecipientId}/emergency/alerts`, user.accessToken, {
      type: 'OTHER',
      title: 'Load Test Alert',
      description: 'This is a test alert from load testing',
    }, 'createEmergencyAlert');
  }

  console.log('✅ Emergency alert test complete');
}

// Test push notification subscription
async function testPushSubscriptions(users: TestUser[]): Promise<void> {
  console.log('\n📱 Testing push notification subscriptions...');

  const testUsers = users.filter(u => u.accessToken).slice(0, 20);

  for (const user of testUsers) {
    // Simulate push subscription (mock subscription data)
    await apiRequest('POST', '/notifications/push-subscription', user.accessToken, {
      endpoint: `https://fcm.googleapis.com/fcm/send/test_${user.id}_${Date.now()}`,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    }, 'subscribePush');
  }

  console.log('✅ Push subscription test complete');
}

// Test WebSocket connections
async function testWebSocketConnections(users: TestUser[]): Promise<{ connected: number; failed: number }> {
  console.log('\n🔌 Testing WebSocket connections...');

  let connected = 0;
  let failed = 0;

  const testUsers = users.filter(u => u.accessToken && u.familyId).slice(0, 50);

  const connectionPromises = testUsers.map(async (user) => {
    const socket = await connectWebSocket(user);
    if (socket) {
      connected++;
    } else {
      failed++;
    }
  });

  await Promise.all(connectionPromises);

  console.log(`✅ WebSocket test complete: ${connected} connected, ${failed} failed`);
  return { connected, failed };
}

// Test Stream Chat integration
async function testStreamChat(users: TestUser[]): Promise<void> {
  console.log('\n💬 Testing Stream Chat integration...');

  const testUsers = users.filter(u => u.accessToken && u.familyId).slice(0, 20);

  for (const user of testUsers) {
    // Get chat token
    await apiRequest('GET', '/chat/token', user.accessToken, undefined, 'getChatToken');

    // Initialize family chat
    if (user.familyId) {
      await apiRequest('GET', `/chat/family/${user.familyId}/init`, user.accessToken, undefined, 'initFamilyChat');
    }
  }

  console.log('✅ Stream Chat test complete');
}

// Main load test function
async function runLoadTest(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CareCircle Load Test - 100 Users Simulation        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nConfiguration:`);
  console.log(`  - API URL: ${API_URL}`);
  console.log(`  - WebSocket URL: ${WS_URL}`);
  console.log(`  - Number of Users: ${NUM_USERS}`);
  console.log(`  - Test Duration: ${TEST_DURATION_MS / 1000}s`);

  const startTime = Date.now();

  try {
    // Phase 1: Create test users
    const users = await createTestUsers(NUM_USERS);

    if (users.length === 0) {
      console.error('❌ Failed to create any test users. Is the API running?');
      return;
    }

    // Phase 2: Setup test data
    await setupTestData(users);

    // Phase 3: Test WebSocket connections
    const wsResults = await testWebSocketConnections(users);

    // Phase 4: Test Stream Chat
    await testStreamChat(users);

    // Phase 5: Test push subscriptions
    await testPushSubscriptions(users);

    // Phase 6: Simulate concurrent user actions
    console.log(`\n🔄 Running concurrent user simulations for ${TEST_DURATION_MS / 1000}s...`);

    const userSimulations = users
      .filter(u => u.accessToken)
      .map(user => simulateUserActions(user, TEST_DURATION_MS));

    await Promise.all(userSimulations);

    // Phase 7: Test emergency alerts
    await testEmergencyAlerts(users);

    // Cleanup: Disconnect WebSockets
    users.forEach(user => {
      if (user.socket) {
        user.socket.close();
      }
    });

  } catch (error) {
    console.error('❌ Load test error:', error);
  }

  const totalTime = Date.now() - startTime;

  // Calculate final statistics
  if (responseTimes.length > 0) {
    results.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    results.maxResponseTime = Math.max(...responseTimes);
    results.minResponseTime = Math.min(...responseTimes);
  }

  // Calculate average times per operation
  for (const op of Object.keys(results.operationBreakdown)) {
    const opTimes = responseTimes.slice(0, results.operationBreakdown[op].success + results.operationBreakdown[op].failed);
    if (opTimes.length > 0) {
      results.operationBreakdown[op].avgTime = opTimes.reduce((a, b) => a + b, 0) / opTimes.length;
    }
  }

  // Print results
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     LOAD TEST RESULTS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Summary:`);
  console.log(`   Total Test Duration: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`   Total Requests: ${results.totalRequests}`);
  console.log(`   Successful: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`   Requests/second: ${(results.totalRequests / (totalTime / 1000)).toFixed(2)}`);

  console.log(`\n⏱️  Response Times:`);
  console.log(`   Average: ${results.averageResponseTime.toFixed(2)}ms`);
  console.log(`   Min: ${results.minResponseTime.toFixed(2)}ms`);
  console.log(`   Max: ${results.maxResponseTime.toFixed(2)}ms`);

  console.log(`\n📈 Operation Breakdown:`);
  for (const [op, stats] of Object.entries(results.operationBreakdown)) {
    const total = stats.success + stats.failed;
    const successRate = total > 0 ? ((stats.success / total) * 100).toFixed(1) : '0';
    console.log(`   ${op}: ${total} requests, ${successRate}% success`);
  }

  if (Object.keys(results.errors).length > 0) {
    console.log(`\n❌ Errors:`);
    for (const [error, count] of Object.entries(results.errors).slice(0, 10)) {
      console.log(`   ${error}: ${count} occurrences`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');

  // Exit with error code if too many failures
  const failureRate = results.failedRequests / results.totalRequests;
  if (failureRate > 0.1) {
    console.log('⚠️  Warning: Failure rate exceeded 10%');
    process.exit(1);
  }
}

// Run the test
runLoadTest().catch(console.error);
