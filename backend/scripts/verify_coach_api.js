const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5001/api';
const EMAIL = 'coach@test.com';
const PASSWORD = 'password123';

async function verifyCoachFeatures() {
    try {
        console.log('🔹 1. Logging in as Coach...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        if (loginRes.data && loginRes.data.data && loginRes.data.data.token) {
            console.log('✅ Login Successful');
            const token = loginRes.data.data.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            console.log('User Role:', loginRes.data.data.user.role);
            const coachId = loginRes.data.data.user.id;
            console.log('Coach ID:', coachId);

            // Story 01: Course Assignments
            console.log('\n🔹 2. Verifying Course Assignments (Story 01)...');
            try {
                const assignmentsRes = await axios.get(`${API_URL}/v2/lms/coach/${coachId}/assignments`, config);
                const assignments = assignmentsRes.data.data || assignmentsRes.data;
                console.log(`✅ GET /assignments: ${assignmentsRes.status} (Found ${assignments.length} assignments)`);
            } catch (err) {
                console.error(`❌ GET /assignments Failed: ${err.message}`);
                if (err.response) console.error(err.response.data);
            }

            // Story 02: Grading
            console.log('\n🔹 3. Verifying Grading Submissions (Story 02)...');
            try {
                const gradingRes = await axios.get(`${API_URL}/v2/lms/coach/grading/${coachId}/submissions`, config);
                const submissions = gradingRes.data.submissions || [];
                console.log(`✅ GET /grading/submissions: ${gradingRes.status} (Found ${submissions.length} submissions)`);
            } catch (err) {
                console.error(`❌ GET /grading/submissions Failed: ${err.message}`);
                if (err.response) console.error(err.response.data);
            }

            // Story 03: Manual Awards
            console.log('\n🔹 4. Verifying Award History (Story 03)...');
            try {
                const awardsRes = await axios.get(`${API_URL}/v2/lms/coach/awards/history`, config);
                console.log(`✅ GET /awards/history: ${awardsRes.status} (Found ${awardsRes.data.length} records)`);
            } catch (err) {
                console.error(`❌ GET /awards/history Failed: ${err.message}`);
                if (err.response) console.error(err.response.data);
            }

            // Story 04: Reports
            console.log('\n🔹 5. Verifying Coach Reports (Story 04)...');
            try {
                const reportsRes = await axios.get(`${API_URL}/v2/lms/coach/reports/overview`, config);
                console.log(`✅ GET /reports/overview: ${reportsRes.status}`);
            } catch (err) {
                console.error(`❌ GET /reports/overview Failed: ${err.message}`);
                if (err.response) console.error(err.response.data);
            }

        } else {
            console.error('❌ Login failed: No token received');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

verifyCoachFeatures();
