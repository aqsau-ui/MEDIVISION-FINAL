const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

const { createProxyMiddleware } = require('http-proxy-middleware');
const { connectMongoDB } = require('./config/mongodb');
const authRoutes = require('./routes/auth');
const doctorAuthRoutes = require('./routes/doctorAuth');
const chatRoutes = require('./routes/chat');
const patientProfileRoutes = require('./routes/patientProfile');

const app = express();
const PORT = process.env.PORT || 5000;
const FASTAPI_URL = 'http://127.0.0.1:8000';

// CORS must come first
app.use(cors());

// ── Proxy FastAPI routes BEFORE body parsers ──────────────────────────────
// IMPORTANT: proxy must be registered before express.json() so that
// multipart/form-data (file uploads) are NOT consumed by the body parser.
const fastapiProxy = createProxyMiddleware({
  target: FASTAPI_URL,
  changeOrigin: true,
  proxyTimeout: 120000,   // 2 min – model inference can be slow
  timeout: 120000,
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'FastAPI backend unavailable', detail: err.message });
      }
    },
  },
});

app.use('/api/xray',                fastapiProxy);
app.use('/api/reports',             fastapiProxy);
app.use('/api/doctors',             fastapiProxy);
app.use('/api/patient-chat',        fastapiProxy);
app.use('/api/doctor-prescription', fastapiProxy);
app.use('/api/notifications',       fastapiProxy);
app.use('/api/uploads',             fastapiProxy);
app.use('/api/progress',            fastapiProxy);

// ── Body parsers (only for Node.js native routes below) ───────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Node.js native routes ─────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/auth',    doctorAuthRoutes);
app.use('/api/chat',    chatRoutes);
app.use('/api/patient', patientProfileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MEDIVISION Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server and connect to MongoDB
const startServer = async () => {
  try {
    console.log('🔄 Starting MEDIVISION Backend...');

    // Connect to MongoDB first
    await connectMongoDB();
    console.log('✅ MongoDB initialization complete');

    // Small delay to ensure all connections are ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
      console.log('✅ Backend is ready to accept requests');
    });

    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
      }
      process.exit(1);
    });

    server.on('close', () => {
      console.log('Server closed');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

startServer();
