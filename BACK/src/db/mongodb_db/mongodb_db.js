// src/db/mongodb.js
// Person A: MongoDB connection using native driver (NO MONGOOSE)
// Week 1 Task: Create connection and test it

const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;

// ============================================
// MONGODB CONNECTION
// ============================================

async function connectMongoDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/taskdb';
    
    console.log('Connecting to MongoDB...');
    console.log(`URI: ${uri.replace(/:.*@/, ':****@')}`); // Hide password in logs
    
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });

    await client.connect();
    db = client.db();

    // Verify connection
    await db.admin().ping();
    console.log('✅ MongoDB connected successfully');

    // Create collections if they don't exist
    await initializeCollections();

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// ============================================
// INITIALIZE COLLECTIONS
// ============================================

async function initializeCollections() {
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Create tasks collection if not exists
    if (!collectionNames.includes('tasks')) {
      await db.createCollection('tasks');
      console.log('  📝 Created "tasks" collection');
      
      // Create indexes for performance
      await db.collection('tasks').createIndex({ projectId: 1 });
      await db.collection('tasks').createIndex({ createdBy: 1 });
      await db.collection('tasks').createIndex({ status: 1 });
      await db.collection('tasks').createIndex({ dueDate: 1 });
    }

    // Create projects collection if not exists
    if (!collectionNames.includes('projects')) {
      await db.createCollection('projects');
      console.log('  📁 Created "projects" collection');
      
      await db.collection('projects').createIndex({ createdBy: 1 });
    }

    // Create users collection if not exists
    if (!collectionNames.includes('users')) {
      await db.createCollection('users');
      console.log('  👥 Created "users" collection');
      
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ username: 1 });
    }

    console.log('✅ Collections initialized');
  } catch (error) {
    console.error('❌ Error initializing collections:', error.message);
    throw error;
  }
}

// ============================================
// GETTERS
// ============================================

function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectMongoDB() first.');
  }
  return db;
}

function getClient() {
  if (!client) {
    throw new Error('MongoDB client not initialized');
  }
  return client;
}

// ============================================
// DISCONNECT
// ============================================

async function disconnectMongoDB() {
  try {
    if (client) {
      await client.close();
      client = null;
      db = null;
      console.log('✅ MongoDB disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting MongoDB:', error.message);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS FOR MONGODB
// ============================================

// Convert string ID to ObjectId
function toObjectId(id) {
  if (typeof id === 'string') {
    return new ObjectId(id);
  }
  return id;
}

// Validate ObjectId
function isValidObjectId(id) {
  try {
    new ObjectId(id);
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  getDB,
  getClient,
  ObjectId,
  toObjectId,
  isValidObjectId
};