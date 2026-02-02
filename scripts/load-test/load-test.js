/**
 * CareCircle Load Testing Script
 * Simulates concurrent users performing various operations
 *
 * Usage:
 *   node load-test.js
 *   NUM_USERS=50 node load-test.js
 *   API_URL=http://api.example.com NUM_USERS=100 node load-test.js
 */

import pg from 'pg';
const { Pool } = pg;

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_PREFIX = '/api/v1';
const NUM_USERS = parseInt(process.env.NUM_USERS || '100');
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION || '60000');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Database pool for OTP verification
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

// Results tracking
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  operationStats: {},
};

// Helper function for API requests
async function apiRequest(method, path, token, body, operation = 'unknown') {
  const startTime = Date.now();

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_URL}${API_PREFIX}${path}`, options);
    const time = Date.now() - startTime;

    results.totalRequests++;
    results.responseTimes.push(time);

    if (!results.operationStats[operation]) {
      results.operationStats[operation] = { success: 0, failed: 0, times: [] };
    }
    results.operationStats[operation].times.push(time);

    if (response.ok) {
      results.successfulRequests++;
      results.operationStats[operation].success++;
      try {
        const data = await response.json();
        return { success: true, data, time };
      } catch {
        return { success: true, data: {}, time };
      }
    } else {
      results.failedRequests++;
      results.operationStats[operation].failed++;
      const errorKey = `${response.status}:${path.split('/')[1] || path}`;
      results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      let errorData = {};
      try { errorData = await response.json(); } catch {}
      return { success: false, error: response.statusText, errorData, time };
    }
  } catch (error) {
    const time = Date.now() - startTime;
    results.totalRequests++;
    results.failedRequests++;

    if (!results.operationStats[operation]) {
      results.operationStats[operation] = { success: 0, failed: 0, times: [] };
    }
    results.operationStats[operation].failed++;
    results.operationStats[operation].times.push(time);

    const errorKey = `Network:${error.code || 'UNKNOWN'}`;
    results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
    return { success: false, error: error.message, time };
  }
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get OTP from database
async function getOtpFromDb(email) {
  try {
    const result = await pool.query(
      'SELECT "emailVerificationCode" FROM "User" WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0]?.emailVerificationCode;
  } catch (error) {
    console.error(`Failed to get OTP for ${email}:`, error.message);
    return null;
  }
}

// Create a test user with email verification
async function createUser(index) {
  const timestamp = Date.now();
  const email = `loadtest${index}_${timestamp}@test.carecircle.com`;
  const password = 'TestPassword123!';

  // Try to register
  const registerResult = await apiRequest('POST', '/auth/register', null, {
    email,
    password,
    fullName: `Load Test User ${index}`,
  }, 'register');

  if (registerResult.success) {
    // Get OTP from database
    await sleep(100); // Small delay to ensure DB write completes
    const otp = await getOtpFromDb(email);

    if (otp) {
      // Verify email
      const verifyResult = await apiRequest('POST', '/auth/verify-email', null, {
        email,
        otp,
      }, 'verifyEmail');

      if (verifyResult.success && verifyResult.data) {
        return {
          id: verifyResult.data.user?.id,
          email,
          password,
          accessToken: verifyResult.data.accessToken,
          refreshToken: verifyResult.data.refreshToken,
          familyId: null,
          careRecipientId: null,
        };
      }
    }
  }

  // Try to login if user might already exist and be verified
  const loginResult = await apiRequest('POST', '/auth/login', null, {
    email,
    password,
  }, 'login');

  if (loginResult.success && loginResult.data) {
    return {
      id: loginResult.data.user?.id,
      email,
      password,
      accessToken: loginResult.data.accessToken,
      refreshToken: loginResult.data.refreshToken,
      familyId: null,
      careRecipientId: null,
    };
  }

  return null;
}

// Setup family and care recipient for a user
async function setupUserData(user, index) {
  if (!user?.accessToken) return user;

  // Create family (only for some users to act as admins)
  if (index % 5 === 0) {
    const familyResult = await apiRequest('POST', '/families', user.accessToken, {
      name: `Test Family ${index}`,
    }, 'createFamily');

    if (familyResult.success && familyResult.data) {
      user.familyId = familyResult.data.id;

      // Create care recipient
      const crResult = await apiRequest('POST', `/families/${user.familyId}/care-recipients`, user.accessToken, {
        fullName: `Care Recipient ${index}`,
        preferredName: `CR${index}`,
        dateOfBirth: '1945-05-15',
        bloodType: 'O+',
        allergies: ['Aspirin'],
        conditions: ['Hypertension'],
      }, 'createCareRecipient');

      if (crResult.success && crResult.data) {
        user.careRecipientId = crResult.data.id;
      }
    }
  }

  return user;
}

// Simulate random user actions
async function simulateUserActions(user, durationMs) {
  if (!user?.accessToken) return;

  const endTime = Date.now() + durationMs;

  while (Date.now() < endTime) {
    const action = Math.floor(Math.random() * 10);

    try {
      switch (action) {
        case 0: // Get medications
          if (user.careRecipientId) {
            await apiRequest('GET', `/care-recipients/${user.careRecipientId}/medications`,
              user.accessToken, null, 'getMedications');
          }
          break;

        case 1: // Get appointments
          if (user.careRecipientId) {
            await apiRequest('GET', `/care-recipients/${user.careRecipientId}/appointments`,
              user.accessToken, null, 'getAppointments');
          }
          break;

        case 2: // Get timeline
          if (user.careRecipientId) {
            await apiRequest('GET', `/care-recipients/${user.careRecipientId}/timeline?limit=10`,
              user.accessToken, null, 'getTimeline');
          }
          break;

        case 3: // Create timeline entry
          if (user.careRecipientId) {
            await apiRequest('POST', `/care-recipients/${user.careRecipientId}/timeline`, user.accessToken, {
              type: 'NOTE',
              title: 'Load test note',
              description: `Test at ${new Date().toISOString()}`,
            }, 'createTimeline');
          }
          break;

        case 4: // Get notifications
          await apiRequest('GET', '/notifications?limit=20', user.accessToken, null, 'getNotifications');
          break;

        case 5: // Refresh token
          if (user.refreshToken) {
            const result = await apiRequest('POST', '/auth/refresh', null, {
              refreshToken: user.refreshToken,
            }, 'refreshToken');
            if (result.success && result.data) {
              user.accessToken = result.data.accessToken;
              user.refreshToken = result.data.refreshToken;
            }
          }
          break;

        case 6: // Get chat token
          await apiRequest('GET', '/chat/token', user.accessToken, null, 'getChatToken');
          break;

        case 7: // Get chat status
          await apiRequest('GET', '/chat/status', user.accessToken, null, 'getChatStatus');
          break;

        case 8: // Get families
          await apiRequest('GET', '/families', user.accessToken, null, 'getFamilies');
          break;

        case 9: // Get emergency info
          if (user.careRecipientId) {
            await apiRequest('GET', `/care-recipients/${user.careRecipientId}/emergency/info`,
              user.accessToken, null, 'getEmergencyInfo');
          }
          break;
      }
    } catch (e) {
      // Continue on error
    }

    // Random delay between 200ms and 2000ms
    await sleep(200 + Math.random() * 1800);
  }
}

// Test emergency alerts
async function testEmergencyAlerts(users) {
  console.log('\n🚨 Testing emergency alerts...');

  const eligibleUsers = users.filter(u => u?.accessToken && u?.careRecipientId);
  const testUsers = eligibleUsers.slice(0, Math.min(3, eligibleUsers.length));

  for (const user of testUsers) {
    await apiRequest('POST', `/care-recipients/${user.careRecipientId}/emergency/alerts`,
      user.accessToken, {
        type: 'OTHER',
        title: 'Load Test Alert',
        description: 'Automated load test alert',
      }, 'createAlert');
  }

  console.log(`   Triggered ${testUsers.length} test alerts`);
}

// Test push notification subscriptions
async function testPushSubscriptions(users) {
  console.log('\n📱 Testing push subscriptions...');

  const testUsers = users.filter(u => u?.accessToken).slice(0, 20);
  let success = 0;

  for (const user of testUsers) {
    const result = await apiRequest('POST', '/notifications/push-subscription', user.accessToken, {
      endpoint: `https://fcm.googleapis.com/fcm/send/${user.id}_${Date.now()}`,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
    }, 'subscribePush');

    if (result.success) success++;
  }

  console.log(`   ${success}/${testUsers.length} subscriptions successful`);
}

// Test Stream Chat
async function testStreamChat(users) {
  console.log('\n💬 Testing Stream Chat...');

  const testUsers = users.filter(u => u?.accessToken && u?.familyId).slice(0, 15);
  let chatTokens = 0;
  let channelInits = 0;

  for (const user of testUsers) {
    // Get chat token
    const tokenResult = await apiRequest('GET', '/chat/token', user.accessToken, null, 'getChatToken');
    if (tokenResult.success) chatTokens++;

    // Init family chat
    const initResult = await apiRequest('GET', `/chat/family/${user.familyId}/init`,
      user.accessToken, null, 'initFamilyChat');
    if (initResult.success) channelInits++;
  }

  console.log(`   Chat tokens: ${chatTokens}/${testUsers.length}`);
  console.log(`   Channel inits: ${channelInits}/${testUsers.length}`);
}

// Test medication CRUD
async function testMedicationCRUD(users) {
  console.log('\n💊 Testing medication operations...');

  const testUsers = users.filter(u => u?.accessToken && u?.careRecipientId).slice(0, 10);
  let created = 0;
  let listed = 0;

  for (const user of testUsers) {
    // Create medication
    const createResult = await apiRequest('POST', `/care-recipients/${user.careRecipientId}/medications`,
      user.accessToken, {
        name: 'Test Medication',
        dosage: '100mg',
        form: 'TABLET',
        frequency: 'DAILY',
        scheduledTimes: ['08:00'],
      }, 'createMedication');

    if (createResult.success) created++;

    // List medications
    const listResult = await apiRequest('GET', `/care-recipients/${user.careRecipientId}/medications`,
      user.accessToken, null, 'listMedications');

    if (listResult.success) listed++;
  }

  console.log(`   Created: ${created}/${testUsers.length}`);
  console.log(`   Listed: ${listed}/${testUsers.length}`);
}

// Print results
function printResults(totalTime) {
  const avgTime = results.responseTimes.length > 0
    ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length
    : 0;
  const maxTime = results.responseTimes.length > 0 ? Math.max(...results.responseTimes) : 0;
  const minTime = results.responseTimes.length > 0 ? Math.min(...results.responseTimes) : 0;
  const rps = results.totalRequests / (totalTime / 1000);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     LOAD TEST RESULTS                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log(`\n📊 Overall Statistics:`);
  console.log(`   Total Duration: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`   Total Requests: ${results.totalRequests}`);
  console.log(`   Successful: ${results.successfulRequests} (${((results.successfulRequests / Math.max(1, results.totalRequests)) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${results.failedRequests} (${((results.failedRequests / Math.max(1, results.totalRequests)) * 100).toFixed(1)}%)`);
  console.log(`   Requests/sec: ${rps.toFixed(2)}`);

  console.log(`\n⏱️  Response Times:`);
  console.log(`   Average: ${avgTime.toFixed(0)}ms`);
  console.log(`   Min: ${minTime}ms`);
  console.log(`   Max: ${maxTime}ms`);

  // Calculate percentiles
  if (results.responseTimes.length > 0) {
    const sorted = [...results.responseTimes].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    console.log(`   P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms`);
  }

  console.log(`\n📈 Operations Breakdown:`);
  const sortedOps = Object.entries(results.operationStats)
    .sort((a, b) => (b[1].success + b[1].failed) - (a[1].success + a[1].failed));

  for (const [op, stats] of sortedOps) {
    const total = stats.success + stats.failed;
    const successRate = ((stats.success / Math.max(1, total)) * 100).toFixed(0);
    const avgOpTime = stats.times.length > 0
      ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(0)
      : 0;
    console.log(`   ${op.padEnd(20)} | ${total.toString().padStart(4)} reqs | ${successRate.padStart(3)}% OK | avg ${avgOpTime}ms`);
  }

  if (Object.keys(results.errors).length > 0) {
    console.log(`\n❌ Errors (top 10):`);
    const sortedErrors = Object.entries(results.errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [error, count] of sortedErrors) {
      console.log(`   ${error}: ${count}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════');

  // Health check summary
  const successRate = results.successfulRequests / Math.max(1, results.totalRequests);
  if (successRate >= 0.95) {
    console.log('✅ PASS: System healthy (>95% success rate)');
  } else if (successRate >= 0.9) {
    console.log('⚠️  WARNING: Some issues detected (90-95% success rate)');
  } else {
    console.log('❌ FAIL: System under stress (<90% success rate)');
  }
}

// Main function
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       CareCircle Load Test - Concurrent User Simulation      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n⚙️  Configuration:`);
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Users: ${NUM_USERS}`);
  console.log(`   Duration: ${TEST_DURATION_MS / 1000}s`);
  console.log(`   Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'connected'}`);

  const startTime = Date.now();

  // Phase 1: Create users with verification
  console.log('\n📝 Phase 1: Creating and verifying test users...');
  const users = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const user = await createUser(i);
    if (user) users.push(user);

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`   Progress: ${i + 1}/${NUM_USERS} users (${users.length} authenticated)\r`);
    }
  }
  console.log(`\n   ✅ Created ${users.length}/${NUM_USERS} authenticated users`);

  if (users.length === 0) {
    console.error('\n❌ No users created. Is the API running at ' + API_URL + '?');
    await pool.end();
    process.exit(1);
  }

  // Phase 2: Setup test data
  console.log('\n📦 Phase 2: Setting up test data...');
  for (let i = 0; i < users.length; i++) {
    users[i] = await setupUserData(users[i], i);
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`   Progress: ${i + 1}/${users.length} users\r`);
    }
  }
  const usersWithData = users.filter(u => u?.familyId && u?.careRecipientId).length;
  console.log(`\n   ✅ ${usersWithData} users have family + care recipient`);

  // Phase 3: Run specific feature tests
  console.log('\n🧪 Phase 3: Feature-specific tests...');
  await testMedicationCRUD(users);
  await testStreamChat(users);
  await testPushSubscriptions(users);

  // Phase 4: Concurrent user simulation
  console.log(`\n🔄 Phase 4: Running ${TEST_DURATION_MS / 1000}s concurrent simulation...`);
  console.log(`   Simulating ${users.length} users performing random actions...`);

  const simulations = users
    .filter(u => u?.accessToken)
    .map(user => simulateUserActions(user, TEST_DURATION_MS));

  await Promise.all(simulations);

  // Phase 5: Emergency alerts
  await testEmergencyAlerts(users);

  const totalTime = Date.now() - startTime;

  // Print results
  printResults(totalTime);

  // Cleanup
  await pool.end();
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  pool.end();
  process.exit(1);
});
