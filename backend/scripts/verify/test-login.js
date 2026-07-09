const axios = require('axios');

const API_BASE = 'http://localhost:5001/api/v1';

// Test users from database
const testUsers = [
  { email: 'admin@gmail.com', role: 'admin', id: '68ab5181408f3118a751d078' },
  { email: 'isfinbengaluru@gmail.com', role: 'coach', id: '6809e00a80aacbb08e74cde6' },
  { email: 'vis@gmail.com', role: 'student', id: '680de27f2fcea3062d68ad76' }
];

// Common passwords to try
const passwords = ['password', 'admin', '123456', 'Password1', 'admin123'];

async function tryLogin(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/users/login`, {
      email,
      password
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

async function findWorkingPassword() {
  console.log('=== Testing Login Credentials ===\n');

  for (const user of testUsers) {
    console.log(`Testing ${user.role.toUpperCase()}: ${user.email}`);

    for (const password of passwords) {
      const result = await tryLogin(user.email, password);
      if (result.success) {
        console.log(`  SUCCESS with password: ${password}`);
        console.log(`  Token: ${result.data.token}`);
        console.log();
        return { user, password, token: result.data.token };
      }
    }

    console.log(`  No password worked from common list`);
    console.log();
  }

  return null;
}

findWorkingPassword()
  .then(result => {
    if (result) {
      console.log('Found working credentials:');
      console.log('User:', result.user.email);
      console.log('Password:', result.password);
      console.log('Token:', result.token);
    } else {
      console.log('No working credentials found. You may need to reset passwords.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
