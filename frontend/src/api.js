import axios from 'axios';

// ─────────────────────────────────────────────────────────────
// Two API clients — one per server.
//
// Node/Express  (port 5000):  auth, trips, flags, insights, chat, profile, assessment
// FastAPI/Python (port 8000): /api/* — ML predictions, driver profiles, leaderboard
//
// In development the Vite proxy handles the routing automatically,
// so both clients point at the same Vite dev-server origin.
// In production set VITE_NODE_URL and VITE_ML_URL separately.
// ─────────────────────────────────────────────────────────────

const NODE_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:5000';
const ML_URL   = import.meta.env.VITE_ML_URL   || 'http://localhost:8000';

// ── Shared interceptor factories ─────────────────────────────

function makeClient(baseURL) {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('dp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res.data,
    (error) => {
      const err = new Error(
        error.response?.data?.message || error.response?.data?.detail || error.message || 'Request failed'
      );
      err.status = error.response?.status;
      err.errors = error.response?.data?.errors;
      throw err;
    }
  );

  return client;
}

// Node server client — auth / trips / flags / insights / chat
const nodeClient = makeClient(NODE_URL);

// FastAPI ML client — /api/* routes
const mlClient = makeClient(ML_URL);

// ── Auth  (Node :5000) ───────────────────────────────────────
export const apiSignup = (body) => nodeClient.post('/auth/signup', body);
export const apiLogin  = (body) => nodeClient.post('/auth/login',  body);
export const apiGetMe  = ()     => nodeClient.get('/auth/me');

// ── Trips  (Node :5000) ──────────────────────────────────────
export const apiGetTrips = ()   => nodeClient.get('/trips');
export const apiGetTrip  = (id) => nodeClient.get(`/trips/${id}`);

// ── Flags  (Node :5000) ──────────────────────────────────────
export const apiGetFlags = ()   => nodeClient.get('/flags');
export const apiGetFlag  = (id) => nodeClient.get(`/flags/${id}`);

// ── Insights  (Node :5000) ───────────────────────────────────
export const apiGetInsights = (driverId) =>
  nodeClient.get('/insights', { params: { driver_id: driverId } });

// ── Chat  (Node :5000) ───────────────────────────────────────
export const apiSendChat      = (question) => nodeClient.post('/chat', { question });
export const apiGetChatHistory = ()        => nodeClient.get('/chat/history');

// ── Profile  (Node :5000) ────────────────────────────────────
export const apiGetProfile = () => nodeClient.get('/profile');

// ── Assessment  (Node :5000) ─────────────────────────────────
export const apiSaveAssessment = (data) => nodeClient.post('/assessment', data);
export const apiGetAssessment  = ()     => nodeClient.get('/assessment');

// ── ML / Driver APIs  (FastAPI :8000) ────────────────────────
export const apiGetDrivers       = (params)     => mlClient.get('/api/drivers', { params });
export const apiGetTopPerformers = (limit = 10) => mlClient.get('/api/drivers/top-performers', { params: { limit } });
export const apiGetDriverProfile = (id)         => mlClient.get(`/api/drivers/${id}`);

/**
 * POST /api/predict-risk
 * Returns { risk_level, confidence, ... } OR { needs_assessment: true }
 * NEVER returns 404 for a registered user.
 */
export const apiPredictRisk = (driverId) =>
  mlClient.post('/api/predict-risk', { driver_id: driverId });

export const apiPostAiInsights = (driverId) =>
  mlClient.post('/api/ai-insights', { driver_id: driverId });

/**
 * POST /api/driver-assessment  (FastAPI — runs ML + saves prediction to DB)
 * Primary endpoint for new-driver assessment form.
 */
export const apiDriverAssessment = (features) =>
  mlClient.post('/api/driver-assessment', features);

/**
 * POST /api/predict-new-driver  (FastAPI — legacy alias)
 */
export const apiPredictNewDriver = (features) =>
  mlClient.post('/api/predict-new-driver', features);
