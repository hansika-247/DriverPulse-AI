// ============================================================
// Driver Pulse — Express Server Entry Point
// ============================================================
import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes       from './routes/auth.routes.js';
import profileRoutes    from './routes/profile.routes.js';
import tripRoutes       from './routes/trip.routes.js';
import flagRoutes       from './routes/flag.routes.js';
import insightRoutes    from './routes/insight.routes.js';
import chatRoutes       from './routes/chat.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import feedbackRoutes   from './routes/feedback.routes.js';

import prisma from './config/prisma.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Utility Middleware ────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Driver Pulse API is running.',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/auth',        authRoutes);
app.use('/profile',     profileRoutes);
app.use('/trips',       tripRoutes);
app.use('/flags',       flagRoutes);
app.use('/insights',    insightRoutes);
app.use('/chat',        chatRoutes);
app.use('/assessment',  assessmentRoutes);
app.use('/feedback',    feedbackRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Global Error Handler ─────────────────────────────────────
// express-async-errors forwards async errors here automatically
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';

  console.error(`[ERROR] ${err.message}`, isDev ? err.stack : '');

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(isDev && { stack: err.stack }),
  });
});

// ── Port availability check ───────────────────────────────────
import net from 'net';

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))   // port is occupied
      .once('listening', () => {
        tester.close();
        resolve(false);                      // port is free
      })
      .listen(port, '0.0.0.0');
  });

// ── Start Server ─────────────────────────────────────────────
const start = async () => {
  // Pre-flight: check if port is already occupied before connecting DB
  const occupied = await isPortInUse(PORT);
  if (occupied) {
    console.error(`\n⚠️  Port ${PORT} already in use. Existing DriverPulse server detected.`);
    console.error(`   Run:  netstat -ano | findstr :${PORT}`);
    console.error(`   Then: Stop-Process -Id <PID> -Force`);
    console.error(`   Then restart this server.\n`);
    process.exit(1);
  }

  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`\n🚀 Driver Pulse API running on port ${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Endpoints:`);
      console.log(`   POST   /auth/signup`);
      console.log(`   POST   /auth/login`);
      console.log(`   GET    /profile`);
      console.log(`   GET    /trips`);
      console.log(`   GET    /trips/:id`);
      console.log(`   GET    /flags`);
      console.log(`   GET    /flags/:id`);
      console.log(`   GET    /insights`);
      console.log(`   POST   /chat`);
      console.log(`   GET    /chat/history`);
      console.log(`   POST   /assessment      ← save assessment form data`);
      console.log(`   GET    /assessment      ← retrieve saved assessment\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
