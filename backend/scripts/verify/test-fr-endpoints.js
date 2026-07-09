/**
 * FR Endpoint Test Script
 *
 * Tests the new FR API endpoints to ensure they work correctly
 * before proceeding with frontend integration.
 *
 * Usage: node test-fr-endpoints.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  log('\n━━━ Test 1: Health Check ━━━', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/`);
    if (response.status === 200) {
      log('✓ Server is running', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ Server health check failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 2: FR Recognize Endpoint (Public)
 * Tests face recognition without authentication
 */
async function testRecognizeEndpoint() {
  log('\n━━━ Test 2: FR Recognize Endpoint (Public) ━━━', 'cyan');

  // Check if test image exists
  const testImagePath = path.join(__dirname, 'test-images', 'test-face.jpg');
  if (!fs.existsSync(testImagePath)) {
    log('⚠️  Test image not found. Skipping recognize endpoint test.', 'yellow');
    log(`   Please add a test face image at: ${testImagePath}`, 'yellow');
    log('   You can use any .jpg image with a clear face photo.', 'yellow');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('photo', fs.createReadStream(testImagePath));
    formData.append('threshold', '0.5');

    const response = await axios.post(
      `${BASE_URL}/api/v2/fr/recognize`,
      formData,
      {
        headers: formData.getHeaders(),
        validateStatus: () => true, // Accept all status codes
      }
    );

    log(`   Status: ${response.status}`, 'blue');
    log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'blue');

    if (response.status === 200) {
      log('✓ Recognize endpoint is working', 'green');
      if (response.data.success) {
        log(`   Recognized student: ${response.data.data.student.name}`, 'green');
        log(`   Confidence: ${response.data.data.confidence}`, 'green');
      }
      return true;
    } else if (response.status === 400) {
      // Expected error responses
      if (response.data.error === 'No face detected in image') {
        log('✓ Endpoint working (no face in test image)', 'green');
        return true;
      } else if (response.data.error === 'No matching face found in database') {
        log('✓ Endpoint working (face not registered)', 'green');
        return true;
      }
    }

    log(`✗ Unexpected response from recognize endpoint`, 'red');
    return false;

  } catch (error) {
    log(`✗ Error testing recognize endpoint: ${error.message}`, 'red');
    if (error.response) {
      log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return false;
  }
}

/**
 * Test 3: FR Stats Endpoint (Requires Auth)
 * Tests statistics endpoint
 */
async function testStatsEndpoint() {
  log('\n━━━ Test 3: FR Stats Endpoint (Requires Auth) ━━━', 'cyan');

  try {
    // This will fail without auth, which is expected
    const response = await axios.get(
      `${BASE_URL}/api/v2/fr/stats`,
      {
        validateStatus: () => true,
      }
    );

    log(`   Status: ${response.status}`, 'blue');

    if (response.status === 401 || response.status === 403) {
      log('✓ Stats endpoint requires authentication (expected)', 'green');
      return true;
    } else if (response.status === 200) {
      log('✓ Stats endpoint is accessible', 'green');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'blue');
      return true;
    }

    log(`✗ Unexpected response from stats endpoint`, 'red');
    return false;

  } catch (error) {
    log(`✗ Error testing stats endpoint: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 4: FR Routes Registered
 * Verifies all FR routes are properly registered
 */
async function testRoutesRegistered() {
  log('\n━━━ Test 4: FR Routes Registered ━━━', 'cyan');

  const routes = [
    { method: 'POST', path: '/api/v2/fr/register', requiresAuth: true },
    { method: 'POST', path: '/api/v2/fr/recognize', requiresAuth: false },
    { method: 'GET', path: '/api/v2/fr/status/test-id', requiresAuth: true },
    { method: 'DELETE', path: '/api/v2/fr/register/test-id', requiresAuth: true },
    { method: 'GET', path: '/api/v2/fr/stats', requiresAuth: true },
  ];

  let allRegistered = true;

  for (const route of routes) {
    try {
      const response = await axios({
        method: route.method.toLowerCase(),
        url: `${BASE_URL}${route.path}`,
        validateStatus: () => true,
      });

      // Routes should not return 404 (not found)
      if (response.status === 404) {
        log(`✗ Route not found: ${route.method} ${route.path}`, 'red');
        allRegistered = false;
      } else if (route.requiresAuth && (response.status === 401 || response.status === 403)) {
        log(`✓ Route registered: ${route.method} ${route.path} (requires auth)`, 'green');
      } else if (response.status === 400) {
        // Bad request means route exists but validation failed (expected)
        log(`✓ Route registered: ${route.method} ${route.path}`, 'green');
      } else {
        log(`✓ Route registered: ${route.method} ${route.path} (status: ${response.status})`, 'green');
      }
    } catch (error) {
      log(`✗ Error checking route ${route.method} ${route.path}: ${error.message}`, 'red');
      allRegistered = false;
    }
  }

  return allRegistered;
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔═══════════════════════════════════════════╗', 'cyan');
  log('║     FR Endpoint Integration Tests       ║', 'cyan');
  log('╚═══════════════════════════════════════════╝', 'cyan');

  const results = [];

  // Run tests sequentially
  results.push({ name: 'Health Check', passed: await testHealthCheck() });
  results.push({ name: 'Routes Registered', passed: await testRoutesRegistered() });
  results.push({ name: 'Recognize Endpoint', passed: await testRecognizeEndpoint() });
  results.push({ name: 'Stats Endpoint', passed: await testStatsEndpoint() });

  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('                 SUMMARY                  ', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const status = result.passed ? '✓' : '✗';
    const color = result.passed ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
  });

  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All FR endpoints are working correctly!', 'green');
    log('   Ready to proceed with frontend integration.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test suite failed with error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
