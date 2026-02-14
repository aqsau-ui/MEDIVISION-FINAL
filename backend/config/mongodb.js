const { MongoClient } = require('mongodb');

let db = null;
let client = null;

const connectMongoDB = async () => {
  try {
    console.log('mongodb.js loaded: Starting MongoDB connection setup...');
    
    // MongoDB connection string - update with your MongoDB credentials
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'medivision_profiles';

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await client.connect();
    db = client.db(dbName);
    
    console.log('✅ MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.error('MongoDB will retry on first use');
    // Don't throw - let the server start anyway
    return null;
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectMongoDB first.');
  }
  return db;
};

const closeConnection = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

module.exports = {
  connectMongoDB,
  getDB,
  closeConnection
};
