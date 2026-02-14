const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convert to promise-based API
const promisePool = pool.promise();

// Test database connection (non-blocking)
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Error details:', err);
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

// Ensure pool doesn't block the event loop
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

module.exports = promisePool;
