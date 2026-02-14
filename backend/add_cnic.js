require('dotenv').config();
const db = require('./config/database');

async function addColumn() {
  try {
    await db.query('ALTER TABLE pending_users ADD COLUMN cnic_number VARCHAR(20) NOT NULL AFTER email');
    console.log('Column added to pending_users');
    await db.query('ALTER TABLE users ADD COLUMN cnic_number VARCHAR(20) NOT NULL AFTER email');
    console.log('Column added to users');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addColumn();