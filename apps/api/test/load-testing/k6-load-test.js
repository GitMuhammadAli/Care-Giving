/**
 * K6 Load Testing Script for CareCircle API
 *
 * Installation:
 * brew install k6 (macOS)
 * choco install k6 (Windows)
 *
 * Usage:
 * k6 run apps/api/test/load-testing/k6-load-test.js
 *
 * Scenarios:
 * 1. Smoke Test: 1 VU for 1 minute
 * 2. Load Test: Ramp up to 100 VUs over 5 minutes
 * 3. Stress Test: Ramp up to 200 VUs over 10 minutes
 * 4. Spike Test: Sudden spike to 500 VUs
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const apiCalls = new Counter('api_calls');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

// Test scenarios
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      gracefulStop: '30s',
      tags: { test_type: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'load' },
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 }, // Spike to 500 users
        { duration: '1m', target: 500 },  // Stay at 500
        { duration: '10s', target: 0 },   // Quick ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],  // Error rate under 1%
    errors: ['rate<0.1'],             // Custom error rate under 10%
    login_duration: ['p(95)<800'],    // Login should be fast
  },
};

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
];

// Utility function to get random test user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Setup: Register test users
export function setup() {
  console.log('Setting up test users...');
  const users = [];

  testUsers.forEach((user) => {
    const payload = JSON.stringify({
      email: user.email,
      password: user.password,
      fullName: `Load Test User ${user.email}`,
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'setup_register' },
    };

    const res = http.post(`${BASE_URL}${API_PREFIX}/auth/register`, payload, params);

    // Check if registration successful or user already exists
    if (res.status === 201 || res.status === 400) {
      users.push(user);
    }
  });

  return { users };
}

// Main test
export default function (data) {
  const user = getRandomUser();
  let accessToken;

  // Group 1: Authentication Flow
  group('Authentication', () => {
    // Login
    const loginStart = new Date();
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post(
      `${BASE_URL}${API_PREFIX}/auth/login`,
      loginPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );

    const loginEnd = new Date();
    loginDuration.add(loginEnd - loginStart);

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns access token': (r) => JSON.parse(r.body).accessToken !== undefined,
    });

    errorRate.add(!loginSuccess);
    apiCalls.add(1);

    if (loginSuccess) {
      accessToken = JSON.parse(loginRes.body).accessToken;
    } else {
      return; // Skip rest if login fails
    }
  });

  // Group 2: Dashboard API Calls
  group('Dashboard', () => {
    const headers = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      tags: { name: 'dashboard' },
    };

    // Get current user
    const meRes = http.get(`${BASE_URL}${API_PREFIX}/auth/me`, headers);
    check(meRes, {
      'get me status is 200': (r) => r.status === 200,
    });
    apiCalls.add(1);

    // Get families
    const familiesRes = http.get(`${BASE_URL}${API_PREFIX}/families`, headers);
    check(familiesRes, {
      'get families status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    apiCalls.add(1);
  });

  // Group 3: Care Recipient Operations
  group('Care Recipients', () => {
    const headers = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      tags: { name: 'care_recipients' },
    };

    // Get care recipients
    const careRecipientsRes = http.get(`${BASE_URL}${API_PREFIX}/care-recipients`, headers);
    check(careRecipientsRes, {
      'get care recipients status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    apiCalls.add(1);
  });

  // Group 4: Notifications
  group('Notifications', () => {
    const headers = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      tags: { name: 'notifications' },
    };

    // Get notifications
    const notificationsRes = http.get(`${BASE_URL}${API_PREFIX}/notifications`, headers);
    check(notificationsRes, {
      'get notifications status is 200': (r) => r.status === 200,
    });
    apiCalls.add(1);

    // Get unread count
    const unreadRes = http.get(`${BASE_URL}${API_PREFIX}/notifications/unread-count`, headers);
    check(unreadRes, {
      'get unread count status is 200': (r) => r.status === 200,
    });
    apiCalls.add(1);
  });

  // Think time - simulate real user behavior
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

// Teardown
export function teardown(data) {
  console.log('Load test completed!');
  console.log(`Total API calls made: ${apiCalls.value}`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// HTML Report Generator
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>CareCircle Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .metric { padding: 10px; margin: 10px 0; background: #f9f9f9; border-left: 4px solid #4CAF50; }
    .error { border-left-color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CareCircle API Load Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <h2>Test Summary</h2>
    <div class="metric">
      <strong>Total Requests:</strong> ${data.metrics.http_reqs?.values.count || 0}
    </div>
    <div class="metric">
      <strong>Request Duration (p95):</strong> ${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms
    </div>
    <div class="metric ${data.metrics.http_req_failed?.values.rate > 0.01 ? 'error' : ''}">
      <strong>Error Rate:</strong> ${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%
    </div>

    <h2>Detailed Metrics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Min</th>
        <th>Avg</th>
        <th>Max</th>
        <th>p(95)</th>
      </tr>
      <tr>
        <td>HTTP Request Duration</td>
        <td>${(data.metrics.http_req_duration?.values.min || 0).toFixed(2)}ms</td>
        <td>${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms</td>
        <td>${(data.metrics.http_req_duration?.values.max || 0).toFixed(2)}ms</td>
        <td>${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>Login Duration</td>
        <td>${(data.metrics.login_duration?.values.min || 0).toFixed(2)}ms</td>
        <td>${(data.metrics.login_duration?.values.avg || 0).toFixed(2)}ms</td>
        <td>${(data.metrics.login_duration?.values.max || 0).toFixed(2)}ms</td>
        <td>${(data.metrics.login_duration?.values['p(95)'] || 0).toFixed(2)}ms</td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

function textSummary(data, options) {
  return `
╔═══════════════════════════════════════════════════════════════╗
║              CareCircle API Load Test Summary                 ║
╚═══════════════════════════════════════════════════════════════╝

Total Requests: ${data.metrics.http_reqs?.values.count || 0}
Failed Requests: ${(data.metrics.http_req_failed?.values.rate * 100 || 0).toFixed(2)}%
Request Duration (avg): ${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms
Request Duration (p95): ${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms

Status: ${data.metrics.http_req_failed?.values.rate < 0.01 ? '✓ PASSED' : '✗ FAILED'}
  `;
}
