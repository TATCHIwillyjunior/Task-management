// src/db/neo4j.js
// Person B: Neo4j connection using native driver (NO ORM)
// Week 1 Task: Create connection and initialize graph schema

const neo4j = require('neo4j-driver');

let driver = null;

// ============================================
// NEO4J CONNECTION
// ============================================

async function connectNeo4j() {
  try {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    console.log('Connecting to Neo4j...');
    console.log(`URI: ${uri}`);

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      connectionLivenessCheckTimeout: 30000,
    });

    // Test the connection
    const session = driver.session();
    try {
      const result = await session.run('RETURN 1');
      console.log('✅ Neo4j connected successfully');
    } finally {
      await session.close();
    }

    // Initialize graph schema
    await initializeGraphSchema();

    return driver;
  } catch (error) {
    console.error('❌ Neo4j connection error:', error.message);
    throw error;
  }
}

// ============================================
// INITIALIZE GRAPH SCHEMA
// ============================================

async function initializeGraphSchema() {
  const session = driver.session();
  
  try {
    console.log('Setting up Neo4j graph schema...');

    // Create constraints
    const constraints = [
      'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
      'CREATE CONSTRAINT task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE',
      'CREATE CONSTRAINT project_id IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
        console.log(`  ✓ ${constraint.split('FOR')[1].split('REQUIRE')[0].trim()}`);
      } catch (error) {
        // Constraint might already exist, which is fine
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)',
      'CREATE INDEX task_status IF NOT EXISTS FOR (t:Task) ON (t.status)',
      'CREATE INDEX project_name IF NOT EXISTS FOR (p:Project) ON (p.name)',
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
        console.log(`  ✓ Index created`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✅ Neo4j graph schema initialized');
  } catch (error) {
    console.error('❌ Error initializing graph schema:', error.message);
    throw error;
  } finally {
    await session.close();
  }
}

// ============================================
// GETTERS
// ============================================

function getNeo4jDriver() {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call connectNeo4j() first.');
  }
  return driver;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function getSession(mode = 'WRITE') {
  if (!driver) {
    throw new Error('Neo4j driver not initialized');
  }
  return driver.session({ defaultAccessMode: neo4j.session.READ });
}

function getWriteSession() {
  return getSession(neo4j.session.WRITE);
}

function getReadSession() {
  return getSession(neo4j.session.READ);
}

// ============================================
// QUERY HELPERS
// ============================================

// Execute a query and return results
async function executeQuery(query, params = {}, mode = 'READ') {
  const session = driver.session({
    defaultAccessMode: mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ
  });

  try {
    const result = await session.run(query, params);
    return result.records;
  } finally {
    await session.close();
  }
}

// Execute write query
async function executeWrite(query, params = {}) {
  return executeQuery(query, params, 'WRITE');
}

// Execute read query
async function executeRead(query, params = {}) {
  return executeQuery(query, params, 'READ');
}

// ============================================
// DISCONNECT
// ============================================

async function disconnectNeo4j() {
  try {
    if (driver) {
      await driver.close();
      driver = null;
      console.log('✅ Neo4j disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting Neo4j:', error.message);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  connectNeo4j,
  disconnectNeo4j,
  getNeo4jDriver,
  getSession,
  getWriteSession,
  getReadSession,
  executeQuery,
  executeWrite,
  executeRead,
  neo4j // Export neo4j module for use in controllers
};