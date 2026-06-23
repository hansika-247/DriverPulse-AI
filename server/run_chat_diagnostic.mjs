import 'dotenv/config';
import axios from 'axios';

const BASE = 'http://localhost:5000';

// Try to login with a known driver
// We'll try test-login endpoint or use DRV1009 who has 18 flags
async function runDiagnostic() {
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC: Testing chat flow for "How many flagged events do I have?"');
  console.log('='.repeat(60));

  // Step 1: Get a token
  console.log('\n[STEP 1] Attempting test-login as DRV1009 (has 18 flags, 7 trips in DB)...');
  let token;
  try {
    const res = await axios.post(`${BASE}/auth/test-login`, { driverId: 'DRV1009' });
    token = res.data?.data?.token;
    console.log(`✅ Token obtained: ${token ? token.slice(0,30) + '...' : 'NONE'}`);
    console.log(`   Driver: ${JSON.stringify(res.data?.data?.driver)}`);
  } catch (err) {
    console.error(`❌ test-login failed: ${err.response?.data?.message || err.message}`);
    
    // Try regular login — need to guess a password
    console.log('[STEP 1b] Trying /auth/login with default credentials...');
    try {
      const res2 = await axios.post(`${BASE}/auth/login`, { driverId: 'DRV1009', password: 'password123' });
      token = res2.data?.data?.token;
      console.log(`✅ Login token: ${token ? token.slice(0,30) + '...' : 'NONE'}`);
    } catch (err2) {
      console.error(`❌ Regular login also failed: ${err2.response?.data?.message || err2.message}`);
      console.log('\n⚠️  Cannot obtain token for automated test. Run manually in the browser.');
      console.log('   The debug logging is already active in chat.service.js');
      console.log('   Just open the app, login, and ask "How many flagged events do I have?"');
      console.log('   Then check the server terminal for [CHAT DEBUG] output.');
      return;
    }
  }

  if (!token) {
    console.error('❌ No token obtained. Check auth routes.');
    return;
  }

  // Step 2: Send the chat question
  console.log('\n[STEP 2] Sending chat question: "How many flagged events do I have?"...');
  try {
    const chatRes = await axios.post(`${BASE}/chat`, 
      { question: 'How many flagged events do I have?', language: 'en' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('\n✅ Chat response received:');
    console.log(JSON.stringify(chatRes.data, null, 2));
    console.log('\n📋 Final answer to user:');
    console.log(chatRes.data?.data?.message?.response);
  } catch (err) {
    console.error(`❌ Chat request failed: ${err.response?.data?.message || err.message}`);
    console.error('Full error:', JSON.stringify(err.response?.data, null, 2));
  }

  // Step 3: Test the second and third questions
  if (token) {
    console.log('\n[STEP 3] Testing: "Which category is most common?"...');
    try {
      const r = await axios.post(`${BASE}/chat`,
        { question: 'Which safety flag category is most common in my history?', language: 'en' },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('Answer:', r.data?.data?.message?.response?.slice(0, 200));
    } catch (e) {
      console.error('❌', e.response?.data?.message || e.message);
    }

    console.log('\n[STEP 4] Testing: "List my latest 5 incidents."...');
    try {
      const r = await axios.post(`${BASE}/chat`,
        { question: 'List my latest 5 incidents.', language: 'en' },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('Answer:', r.data?.data?.message?.response?.slice(0, 300));
    } catch (e) {
      console.error('❌', e.response?.data?.message || e.message);
    }
  }
}

runDiagnostic().catch(console.error);
