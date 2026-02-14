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

const { connectMongoDB } = require('./config/mongodb');
const authRoutes = require('./routes/auth');
const doctorAuthRoutes = require('./routes/doctorAuth');
const chatRoutes = require('./routes/chat');
const xrayValidationRoutes = require('./routes/xrayValidation');
const patientProfileRoutes = require('./routes/patientProfile');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', doctorAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/xray', xrayValidationRoutes);
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

    // Keep process alive
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
