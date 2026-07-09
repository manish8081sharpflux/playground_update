const axios = require('axios');

const API_BASE = 'http://localhost:5001/api/v2';
const AUTH_BASE = 'http://localhost:5001/api/auth';

async function testTransactionResponse() {
  try {
    // Login as admin
    const loginResponse = await axios.post(`${AUTH_BASE}/login`, {
      email: 'admin@gmail.com',
      password: 'test123'
    });

    const token = loginResponse.data.data.token;
    console.log('✓ Logged in as Admin\n');

    // Get transactions
    const response = await axios.get(`${API_BASE}/shop/admin/reports/transactions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('API Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTransactionResponse();
