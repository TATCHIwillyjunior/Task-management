// src/server.js
// Express application setup and server initialization
// This is the main entry point for the application

const express = require('express');
const dotenv = require('dotenv');
const { connectMongoDB, getDB } = require('./db/mongodb_db/mongodb_db');
const { connectNeo4j, getNeo4jDriver } = require('./db/neo4j_db/neo4j_db');
const { connectRedis, getRedisClient } = require('./db/redis_db/redis_db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (simple)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// HEALTH CHECK ENDPOINT (for Docker)
// ============================================

app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'running',
      timestamp: new Date().toISOString(),
      databases: {
        mongodb: 'checking...',
        neo4j: 'checking...',
        redis: 'checking...'
      }
    };

    // Check MongoDB
    try {
      const db = getDB();
      await db.admin().ping();
      health.databases.mongodb = 'healthy';
    } catch (err) {
      health.databases.mongodb = `error: ${err.message}`;
    }

    // Check Neo4j
    try {
      const driver = getNeo4jDriver();
      if (driver) {
        await driver.getServerInfo();
        health.databases.neo4j = 'healthy';
      }
    } catch (err) {
      health.databases.neo4j = `error: ${err.message}`;
    }

    // Check Redis
    try {
      const client = getRedisClient();
      if (client && client.isOpen) {
        await client.ping();
        health.databases.redis = 'healthy';
      }
    } catch (err) {
      health.databases.redis = `error: ${err.message}`;
    }

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// API ROUTES (To be implemented by team)
// ============================================

// Task routes (keylan) - for task CRUD operations and management
app.use('/api/tasks', require('./routes/mongodbRoute/mongodbRoute_tasks'));

// Project routes (keylan) - for project management and task grouping
app.use('/api/projects', require('./routes/mongodbRoute/mongodbRoute_tasks'));

// User routes (keylan) - for user management and authentication
app.use('/api/users', require('./routes/mongodbRoute/mongodbRoute_tasks'));

// Relationship routes (Fred) - for Neo4j graph relationships
app.use('/api/relationships', require('./routes/neo4jRoute/neo4jRoute_relationships'));

// Redis routes (Willy) - for Redis operations
app.use('/api/redis', require('./routes/RedisRoute/RedisRoute_redis'));

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Task Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      tasks: '/api/tasks',
      projects: '/api/projects',
      users: '/api/users',
      relationships: '/api/relationships',
      redis: '/api/redis'
    }
  });
});

// ============================================
// 404 NOT FOUND
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} does not exist`,
    status: 404
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// DATABASE CONNECTIONS & SERVER START
// ============================================

async function startServer() {
  try {
    console.log('🚀 Starting Task Management System Server...\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ MongoDB connected\n');

    // Connect to Neo4j
    console.log('📊 Connecting to Neo4j...');
    await connectNeo4j();
    console.log('✅ Neo4j connected\n');

    // Connect to Redis
    console.log('⚡ Connecting to Redis...');
    await connectRedis();
    console.log('✅ Redis connected\n');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🎉 Server running on http://localhost:${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`\n✨ All databases connected and ready!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  try {
    const neo4jDriver = getNeo4jDriver();
    if (neo4jDriver) {
      await neo4jDriver.close();
      console.log('✅ Neo4j connection closed');
    }

    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    }

    console.log('✅ Server shut down complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
});

// Start the server
startServer();

module.exports = app;