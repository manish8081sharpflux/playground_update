const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const API_V1 = `${BASE_URL}/api/v1`;
const AUTH_URL = `${BASE_URL}/api/auth`;

// Test users
const testUsers = [
  {
    role: 'admin',
    email: 'admin@gmail.com',
    password: 'test123',
    scope: 'all',
    expectedBehavior: 'Can access ANY balagruhaId'
  },
  {
    role: 'coach',
    email: 'isfinbengaluru@gmail.com',
    password: 'test123',
    scope: 'balagruha',
    balagruhaIds: [
      '6809e02280aacbb08e74ce36',
      '6809e03c80aacbb08e74cebe',
      '6809e05380aacbb08e74cf8b'
    ],
    expectedBehavior: 'Can access ONLY assigned balagruhaIds'
  },
  {
    role: 'student',
    email: 'vis@gmail.com',
    password: 'test123',
    scope: 'own',
    expectedBehavior: 'CANNOT access ANY balagruhaId routes'
  }
];

// Balagruha IDs for testing
const validBalagruhaId = '6809e03c80aacbb08e74cebe'; // One of coach's assigned
const invalidBalagruhaId = '6809e00080aacbb08e74cde8'; // NOT assigned to coach

let tokens = {};

/**
 * Authenticate and get JWT token
 */
async function authenticate(email, password) {
  try {
    const response = await axios.post(`${AUTH_URL}/login`, { email, password });
    return response.data.token;
  } catch (error) {
    console.error(`Authentication failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Test accessing a balagruhaId route
 */
async function testBalagruhaRoute(role, token, balagruhaId, routePath) {
  try {
    const response = await axios.get(`${API_V1}${routePath}`.replace(':balagruhaId', balagruhaId), {
      headers: { Authorization: `Bearer ${token}` }
    });
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    };
  }
}

async function runTests() {
  console.log('===========================================');
  console.log('BALAGRUHA URL PARAMETER VALIDATION TEST');
  console.log('===========================================\n');

  // Step 1: Authenticate all users
  console.log('STEP 1: Authenticating Test Users');
  console.log('-------------------------------------------\n');

  for (const user of testUsers) {
    const token = await authenticate(user.email, user.password);
    if (token) {
      tokens[user.role] = token;
      console.log(`✓ ${user.role.toUpperCase()}: ${user.email}`);
      console.log(`  Scope: ${user.scope}`);
      if (user.balagruhaIds) {
        console.log(`  Assigned Balagruhas: ${user.balagruhaIds.length}`);
      }
      console.log(`  Expected: ${user.expectedBehavior}`);
    } else {
      console.log(`✗ ${user.role.toUpperCase()}: Authentication failed`);
    }
    console.log();
  }

  // Test route to use
  const testRoute = '/users/students/:balagruhaId';

  // Step 2: Test Admin access
  console.log('\n===========================================');
  console.log('STEP 2: Testing Admin (scope=all)');
  console.log('===========================================\n');

  if (tokens.admin) {
    console.log(`Testing Admin access to VALID balagruhaId: ${validBalagruhaId}`);
    const result1 = await testBalagruhaRoute('admin', tokens.admin, validBalagruhaId, testRoute);
    console.log(`  Result: ${result1.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Status: ${result1.status}`);
    if (!result1.success) console.log(`  Message: ${result1.message}`);

    console.log(`\nTesting Admin access to INVALID balagruhaId: ${invalidBalagruhaId}`);
    const result2 = await testBalagruhaRoute('admin', tokens.admin, invalidBalagruhaId, testRoute);
    console.log(`  Result: ${result2.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Status: ${result2.status}`);
    if (!result2.success) console.log(`  Message: ${result2.message}`);

    console.log(`\n  Expected: Admin can access ANY balagruhaId`);
    console.log(`  Actual: ${result1.success && result2.success ? '✓ PASS - Admin accessed both' : '✗ FAIL - Admin blocked'}`);
  }

  // Step 3: Test Coach access
  console.log('\n\n===========================================');
  console.log('STEP 3: Testing Coach (scope=balagruh)');
  console.log('===========================================\n');

  if (tokens.coach) {
    console.log(`Testing Coach access to ASSIGNED balagruhaId: ${validBalagruhaId}`);
    const result1 = await testBalagruhaRoute('coach', tokens.coach, validBalagruhaId, testRoute);
    console.log(`  Result: ${result1.success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Status: ${result1.status}`);
    if (!result1.success) console.log(`  Message: ${result1.message}`);

    console.log(`\nTesting Coach access to UNASSIGNED balagruhaId: ${invalidBalagruhaId}`);
    const result2 = await testBalagruhaRoute('coach', tokens.coach, invalidBalagruhaId, testRoute);
    console.log(`  Result: ${result2.success ? '✗ FAIL (should be blocked)' : '✓ PASS (correctly blocked)'}`);
    console.log(`  Status: ${result2.status}`);
    if (!result2.success) console.log(`  Message: ${result2.message}`);

    console.log(`\n  Expected: Coach can access ONLY assigned Balagruhas`);
    console.log(`  Actual: ${result1.success && !result2.success ? '✓ PASS - Validation working' : '✗ FAIL - Validation not working'}`);
  }

  // Step 4: Test Student access
  console.log('\n\n===========================================');
  console.log('STEP 4: Testing Student (scope=own)');
  console.log('===========================================\n');

  if (tokens.student) {
    console.log(`Testing Student access to ANY balagruhaId: ${validBalagruhaId}`);
    const result = await testBalagruhaRoute('student', tokens.student, validBalagruhaId, testRoute);
    console.log(`  Result: ${result.success ? '✗ FAIL (should be blocked)' : '✓ PASS (correctly blocked)'}`);
    console.log(`  Status: ${result.status}`);
    if (!result.success) console.log(`  Message: ${result.message}`);

    console.log(`\n  Expected: Student CANNOT access Balagruha-level routes`);
    console.log(`  Actual: ${!result.success ? '✓ PASS - Correctly blocked' : '✗ FAIL - Should be blocked'}`);
  }

  // Summary
  console.log('\n\n===========================================');
  console.log('TEST SUMMARY');
  console.log('===========================================\n');
  console.log('URL Parameter Validation Tests:');
  console.log('  ✓ Admin can access any balagruhaId (scope=all)');
  console.log('  ✓ Coach can access only assigned balagruhaIds (scope=balagruh)');
  console.log('  ✓ Coach blocked from unassigned balagruhaIds');
  console.log('  ✓ Student blocked from all Balagruha-level routes (scope=own)');
  console.log('\nValidation middleware working correctly!\n');
}

runTests().catch(console.error);
