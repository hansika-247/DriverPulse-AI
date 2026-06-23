// Test the feedback stats endpoint directly
import fetch from 'node-fetch';

const BASE = 'http://localhost:5000';

async function run() {
  // 1. Login to get a token
  console.log('--- Step 1: Login ---');
  let loginRes;
  try {
    loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver1@driverpulse.com', password: 'password123' })
    });
    const loginBody = await loginRes.json();
    console.log('Login Status:', loginRes.status);
    console.log('Login Body:', JSON.stringify(loginBody, null, 2));

    if (!loginBody.data?.token) {
      console.error('❌ No token returned. Cannot continue.');
      return;
    }

    const token = loginBody.data.token;

    // 2. Call /feedback/stats?global=true
    console.log('\n--- Step 2: GET /feedback/stats?global=true ---');
    const statsRes = await fetch(`${BASE}/feedback/stats?global=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const statsBody = await statsRes.json();
    console.log('Stats Status:', statsRes.status);
    console.log('Stats Body:', JSON.stringify(statsBody, null, 2));

    if (statsRes.status === 200) {
      console.log('\n✅ SUCCESS — Stats data.stats:', JSON.stringify(statsBody?.data?.stats, null, 2));
    } else {
      console.log('\n❌ FAILURE — non-200 status:', statsRes.status);
    }
  } catch(e) {
    console.error('❌ Error (server likely not running):', e.message);
    console.log('\nMake sure the Node server is running on port 5000');
  }
}

run();
