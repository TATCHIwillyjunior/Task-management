// scripts/seed-db.js
// Complete sample data generator for MongoDB, Neo4j, and Redis

const { MongoClient, ObjectId } = require('mongodb');
const neo4j = require('neo4j-driver');
const redis = require('redis');

// Configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/taskdb?authSource=admin'
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

// ============================================
// SEED MONGODB
// ============================================

async function seedMongoDB(db) {
  console.log(`${colors.blue}📦 Seeding MongoDB...${colors.reset}`);

  try {
    // Create users
    const users = await db.collection('users').insertMany([
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed_password_1',
        role: 'manager',
        createdAt: new Date()
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        password: 'hashed_password_2',
        role: 'developer',
        createdAt: new Date()
      },
      {
        username: 'charlie',
        email: 'charlie@example.com',
        password: 'hashed_password_3',
        role: 'developer',
        createdAt: new Date()
      },
      {
        username: 'diana',
        email: 'diana@example.com',
        password: 'hashed_password_4',
        role: 'designer',
        createdAt: new Date()
      },
      {
        username: 'eve',
        email: 'eve@example.com',
        password: 'hashed_password_5',
        role: 'tester',
        createdAt: new Date()
      }
    ]);

    console.log(`${colors.green}✅ Created 5 users${colors.reset}`);

    // Create projects
    const projects = await db.collection('projects').insertMany([
      {
        name: 'Website Redesign',
        description: 'Complete overhaul of company website',
        createdBy: users.insertedIds[0],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Mobile App',
        description: 'New iOS and Android app',
        createdBy: users.insertedIds[0],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'API Enhancement',
        description: 'Improve REST API performance',
        createdBy: users.insertedIds[1],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Database Migration',
        description: 'Migrate from SQL to NoSQL',
        createdBy: users.insertedIds[0],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    console.log(`${colors.green}✅ Created 4 projects${colors.reset}`);

    // Create tasks
    const tasks = await db.collection('tasks').insertMany([
      {
        title: 'Design homepage mockup',
        description: 'Create initial mockup for new homepage',
        status: 'done',
        priority: 'high',
        dueDate: new Date('2026-04-15'),
        projectId: projects.insertedIds[0],
        createdBy: users.insertedIds[3],
        comments: [
          {
            author: users.insertedIds[0],
            text: 'Great design! Let\'s move forward.',
            createdAt: new Date('2026-04-10')
          }
        ],
        createdAt: new Date('2026-03-20'),
        updatedAt: new Date('2026-04-15')
      },
      {
        title: 'Implement responsive layout',
        description: 'Make design responsive for mobile',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date('2026-04-30'),
        projectId: projects.insertedIds[0],
        createdBy: users.insertedIds[1],
        comments: [],
        createdAt: new Date('2026-03-25'),
        updatedAt: new Date('2026-04-20')
      },
      {
        title: 'Setup development environment',
        description: 'Configure Node, npm, and Docker',
        status: 'done',
        priority: 'high',
        dueDate: new Date('2026-02-15'),
        projectId: projects.insertedIds[2],
        createdBy: users.insertedIds[1],
        comments: [],
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-15')
      },
      {
        title: 'Write API documentation',
        description: 'Document all endpoints',
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date('2026-05-10'),
        projectId: projects.insertedIds[2],
        createdBy: users.insertedIds[1],
        comments: [],
        createdAt: new Date('2026-04-01'),
        updatedAt: new Date('2026-04-20')
      },
      {
        title: 'Fix critical bug in login',
        description: 'Users unable to login on mobile',
        status: 'done',
        priority: 'high',
        dueDate: new Date('2026-04-01'),
        projectId: projects.insertedIds[0],
        createdBy: users.insertedIds[1],
        comments: [],
        createdAt: new Date('2026-03-30'),
        updatedAt: new Date('2026-04-01')
      },
      {
        title: 'Database schema design',
        description: 'Design MongoDB and Neo4j schemas',
        status: 'done',
        priority: 'high',
        dueDate: new Date('2026-03-10'),
        projectId: projects.insertedIds[3],
        createdBy: users.insertedIds[0],
        comments: [],
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-03-10')
      },
      {
        title: 'Create user authentication',
        description: 'Implement JWT auth flow',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date('2026-04-25'),
        projectId: projects.insertedIds[2],
        createdBy: users.insertedIds[1],
        comments: [],
        createdAt: new Date('2026-03-15'),
        updatedAt: new Date('2026-04-10')
      },
      {
        title: 'Test payment integration',
        description: 'Test Stripe integration',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date('2026-05-15'),
        projectId: projects.insertedIds[1],
        createdBy: users.insertedIds[4],
        comments: [],
        createdAt: new Date('2026-04-18'),
        updatedAt: new Date('2026-04-18')
      },
      {
        title: 'Fix overdue task - Critical Database Issue',
        description: 'This task is overdue and needs attention',
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date('2026-03-01'), // Overdue!
        projectId: projects.insertedIds[3],
        createdBy: users.insertedIds[0],
        comments: [],
        createdAt: new Date('2026-02-25'),
        updatedAt: new Date('2026-04-20')
      }
    ]);

    console.log(`${colors.green}✅ Created 9 tasks${colors.reset}`);

    // Create indexes
    await db.collection('tasks').createIndex({ projectId: 1 });
    await db.collection('tasks').createIndex({ createdBy: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('tasks').createIndex({ dueDate: 1 });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    console.log(`${colors.green}✅ Created database indexes${colors.reset}`);

    return { users, projects, tasks };
  } catch (error) {
    console.error(`${colors.red}❌ MongoDB seeding failed: ${error.message}${colors.reset}`);
    throw error;
  }
}

// ============================================
// SEED NEO4J
// ============================================

async function seedNeo4j(driver, userData) {
  console.log(`${colors.blue}📊 Seeding Neo4j...${colors.reset}`);

  const session = driver.session();

  try {
    // Create users
    for (const user of userData.docs.users) {
      await session.run(
        `CREATE (u:User {id: $id, username: $username, email: $email})`,
        {
          id: user._id.toString(),
          username: user.username,
          email: user.email
        }
      );
    }
    console.log(`${colors.green}✅ Created 5 user nodes${colors.reset}`);

    // Create tasks
    for (const task of userData.docs.tasks) {
      await session.run(
        `CREATE (t:Task {id: $id, title: $title, status: $status})`,
        {
          id: task._id.toString(),
          title: task.title,
          status: task.status
        }
      );
    }
    console.log(`${colors.green}✅ Created 9 task nodes${colors.reset}`);

    // Create projects
    for (const project of userData.docs.projects) {
      await session.run(
        `CREATE (p:Project {id: $id, name: $name})`,
        {
          id: project._id.toString(),
          name: project.name
        }
      );
    }
    console.log(`${colors.green}✅ Created 4 project nodes${colors.reset}`);

    // Create skills
    const skills = ['Node.js', 'React', 'MongoDB', 'Neo4j', 'Redis', 'DevOps', 'UI Design', 'Testing'];
    for (const skill of skills) {
      await session.run(
        `MERGE (s:Skill {name: $name})`,
        { name: skill }
      );
    }
    console.log(`${colors.green}✅ Created 8 skill nodes${colors.reset}`);

    // Create relationships
    // User -> HAS_SKILL
    await session.run(`
      MATCH (u:User {username: 'bob'})
      MATCH (s:Skill {name: 'Node.js'})
      CREATE (u)-[:HAS_SKILL]->(s)
    `);
    
    await session.run(`
      MATCH (u:User {username: 'bob'})
      MATCH (s:Skill {name: 'MongoDB'})
      CREATE (u)-[:HAS_SKILL]->(s)
    `);

    await session.run(`
      MATCH (u:User {username: 'diana'})
      MATCH (s:Skill {name: 'UI Design'})
      CREATE (u)-[:HAS_SKILL]->(s)
    `);

    console.log(`${colors.green}✅ Created HAS_SKILL relationships${colors.reset}`);

    // User -> MEMBER_OF -> Project
    await session.run(`
      MATCH (u:User {username: 'alice'})
      MATCH (p:Project {name: 'Website Redesign'})
      CREATE (u)-[:MEMBER_OF]->(p)
    `);

    await session.run(`
      MATCH (u:User {username: 'bob'})
      MATCH (p:Project {name: 'API Enhancement'})
      CREATE (u)-[:MEMBER_OF]->(p)
    `);

    console.log(`${colors.green}✅ Created MEMBER_OF relationships${colors.reset}`);

    // User -> REPORTS_TO -> Manager
    await session.run(`
      MATCH (u:User {username: 'bob'})
      MATCH (m:User {username: 'alice'})
      CREATE (u)-[:REPORTS_TO]->(m)
    `);

    console.log(`${colors.green}✅ Created REPORTS_TO relationships${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Neo4j seeding failed: ${error.message}${colors.reset}`);
    throw error;
  } finally {
    await session.close();
  }
}

// ============================================
// SEED REDIS
// ============================================

async function seedRedis(client) {
  console.log(`${colors.blue}⚡ Seeding Redis...${colors.reset}`);

  try {
    // Store sessions
    await client.setEx('session:user_alice', 86400, JSON.stringify({
      userId: 'alice_id',
      username: 'alice',
      role: 'manager',
      loginTime: new Date().toISOString()
    }));

    // Cache user profiles
    await client.hSet('user:alice_id', {
      username: 'alice',
      email: 'alice@example.com',
      role: 'manager'
    });

    console.log(`${colors.green}✅ Cached sessions and profiles${colors.reset}`);

    // Initialize leaderboard
    await client.zAdd('leaderboard:users', [
      { score: 25, value: 'alice' },
      { score: 18, value: 'bob' },
      { score: 12, value: 'charlie' },
      { score: 8, value: 'diana' },
      { score: 5, value: 'eve' }
    ]);

    console.log(`${colors.green}✅ Created leaderboard (sorted set)${colors.reset}`);

    // Create activity feeds
    await client.lPush(
      'activity:alice_id',
      JSON.stringify({
        type: 'task_completed',
        taskId: 'task_1',
        timestamp: new Date().toISOString()
      }),
      JSON.stringify({
        type: 'user_joined_project',
        projectId: 'project_1',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      })
    );

    console.log(`${colors.green}✅ Created activity feeds (lists)${colors.reset}`);

    // Create tags
    await client.sAdd('tag:urgent', ['task_1', 'task_5', 'task_9']);
    await client.sAdd('tag:backend', ['task_2', 'task_3', 'task_7']);
    await client.sAdd('tag:frontend', ['task_2', 'task_4']);

    console.log(`${colors.green}✅ Created tags (sets)${colors.reset}`);

    // Set TTL for all keys
    await client.expire('session:user_alice', 86400);
    await client.expire('user:alice_id', 600);
    await client.expire('leaderboard:users', 86400);

    console.log(`${colors.green}✅ Set TTL for cache keys${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Redis seeding failed: ${error.message}${colors.reset}`);
    throw error;
  }
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedDatabase() {
  console.log(`${colors.yellow}
╔════════════════════════════════════════╗
║  Task Management System - Data Seeding  ║
╚════════════════════════════════════════╝
${colors.reset}`);

  let mongoClient, neo4jDriver, redisClient;

  try {
    // Connect to MongoDB
    console.log('\n📦 Connecting to MongoDB...');
    mongoClient = new MongoClient(config.mongodb.uri);
    await mongoClient.connect();
    const db = mongoClient.db();
    console.log(`${colors.green}✅ Connected to MongoDB${colors.reset}`);

    // Connect to Neo4j
    console.log('\n📊 Connecting to Neo4j...');
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password)
    );
    await neo4jDriver.verifyConnectivity();
    console.log(`${colors.green}✅ Connected to Neo4j${colors.reset}`);

    // Connect to Redis
    console.log('\n⚡ Connecting to Redis...');
    redisClient = redis.createClient({ url: config.redis.url });
    await redisClient.connect();
    console.log(`${colors.green}✅ Connected to Redis${colors.reset}`);

    // Clear existing data
    console.log('\n🧹 Clearing existing data...');
    await db.collection('tasks').deleteMany({});
    await db.collection('projects').deleteMany({});
    await db.collection('users').deleteMany({});
    console.log(`${colors.green}✅ Cleared MongoDB collections${colors.reset}`);

    // Seed databases
    console.log('\n🌱 Seeding databases...');
    const userData = {
      users: await db.collection('users').insertMany([
        {
          username: 'alice',
          email: 'alice@example.com',
          password: 'hashed_password_1',
          role: 'manager',
          createdAt: new Date()
        },
        {
          username: 'bob',
          email: 'bob@example.com',
          password: 'hashed_password_2',
          role: 'developer',
          createdAt: new Date()
        },
        {
          username: 'charlie',
          email: 'charlie@example.com',
          password: 'hashed_password_3',
          role: 'developer',
          createdAt: new Date()
        },
        {
          username: 'diana',
          email: 'diana@example.com',
          password: 'hashed_password_4',
          role: 'designer',
          createdAt: new Date()
        },
        {
          username: 'eve',
          email: 'eve@example.com',
          password: 'hashed_password_5',
          role: 'tester',
          createdAt: new Date()
        }
      ]),
      projects: null,
      tasks: null,
      docs: { users: [], projects: [], tasks: [] }
    };

    // Seed each database
    userData.projects = await db.collection('projects').insertMany([
      { name: 'Website Redesign', description: 'Complete overhaul of company website', createdBy: userData.users.insertedIds[0], createdAt: new Date(), updatedAt: new Date() },
      { name: 'Mobile App', description: 'New iOS and Android app', createdBy: userData.users.insertedIds[0], createdAt: new Date(), updatedAt: new Date() },
      { name: 'API Enhancement', description: 'Improve REST API performance', createdBy: userData.users.insertedIds[1], createdAt: new Date(), updatedAt: new Date() },
      { name: 'Database Migration', description: 'Migrate from SQL to NoSQL', createdBy: userData.users.insertedIds[0], createdAt: new Date(), updatedAt: new Date() }
    ]);

    userData.tasks = await db.collection('tasks').insertMany([
      { title: 'Design homepage mockup', description: 'Create initial mockup', status: 'done', priority: 'high', dueDate: new Date('2026-04-15'), projectId: userData.projects.insertedIds[0], createdBy: userData.users.insertedIds[3], comments: [], createdAt: new Date('2026-03-20'), updatedAt: new Date('2026-04-15') },
      { title: 'Implement responsive layout', description: 'Make responsive for mobile', status: 'in-progress', priority: 'high', dueDate: new Date('2026-04-30'), projectId: userData.projects.insertedIds[0], createdBy: userData.users.insertedIds[1], comments: [], createdAt: new Date('2026-03-25'), updatedAt: new Date('2026-04-20') },
      { title: 'Setup development environment', description: 'Configure Node, npm, Docker', status: 'done', priority: 'high', dueDate: new Date('2026-02-15'), projectId: userData.projects.insertedIds[2], createdBy: userData.users.insertedIds[1], comments: [], createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-15') },
      { title: 'Write API documentation', description: 'Document all endpoints', status: 'in-progress', priority: 'medium', dueDate: new Date('2026-05-10'), projectId: userData.projects.insertedIds[2], createdBy: userData.users.insertedIds[1], comments: [], createdAt: new Date('2026-04-01'), updatedAt: new Date('2026-04-20') },
      { title: 'Fix critical bug in login', description: 'Users unable to login on mobile', status: 'done', priority: 'high', dueDate: new Date('2026-04-01'), projectId: userData.projects.insertedIds[0], createdBy: userData.users.insertedIds[1], comments: [], createdAt: new Date('2026-03-30'), updatedAt: new Date('2026-04-01') },
      { title: 'Database schema design', description: 'Design MongoDB and Neo4j schemas', status: 'done', priority: 'high', dueDate: new Date('2026-03-10'), projectId: userData.projects.insertedIds[3], createdBy: userData.users.insertedIds[0], comments: [], createdAt: new Date('2026-02-20'), updatedAt: new Date('2026-03-10') },
      { title: 'Create user authentication', description: 'Implement JWT auth flow', status: 'in-progress', priority: 'high', dueDate: new Date('2026-04-25'), projectId: userData.projects.insertedIds[2], createdBy: userData.users.insertedIds[1], comments: [], createdAt: new Date('2026-03-15'), updatedAt: new Date('2026-04-10') },
      { title: 'Test payment integration', description: 'Test Stripe integration', status: 'todo', priority: 'medium', dueDate: new Date('2026-05-15'), projectId: userData.projects.insertedIds[1], createdBy: userData.users.insertedIds[4], comments: [], createdAt: new Date('2026-04-18'), updatedAt: new Date('2026-04-18') },
      { title: 'Fix overdue task', description: 'Critical issue needing attention', status: 'in-progress', priority: 'high', dueDate: new Date('2026-03-01'), projectId: userData.projects.insertedIds[3], createdBy: userData.users.insertedIds[0], comments: [], createdAt: new Date('2026-02-25'), updatedAt: new Date('2026-04-20') }
    ]);

    // Create indexes
    await db.collection('tasks').createIndex({ projectId: 1 });
    await db.collection('tasks').createIndex({ createdBy: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('tasks').createIndex({ dueDate: 1 });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log(`${colors.green}✅ Created database indexes${colors.reset}`);

    // Get docs for Neo4j seeding
    userData.docs.users = await db.collection('users').find({}).toArray();
    userData.docs.projects = await db.collection('projects').find({}).toArray();
    userData.docs.tasks = await db.collection('tasks').find({}).toArray();

    await seedNeo4j(neo4jDriver, userData);
    await seedRedis(redisClient);

    console.log(`
${colors.green}
╔════════════════════════════════════════╗
║     ✅ SEEDING COMPLETED SUCCESSFULLY  ║
╚════════════════════════════════════════╝
${colors.reset}

Summary:
  📦 MongoDB:   5 users + 4 projects + 9 tasks
  📊 Neo4j:     5 user nodes + 9 task nodes + 4 project nodes + 8 skills
  ⚡ Redis:     Sessions, profiles, leaderboard, activity feeds, tags

Ready to test! 🚀
`);

  } catch (error) {
    console.error(`${colors.red}
╔════════════════════════════════════════╗
║     ❌ SEEDING FAILED                  ║
╚════════════════════════════════════════╝
${colors.reset}
Error: ${error.message}`);
    process.exit(1);
  } finally {
    // Close connections
    if (mongoClient) await mongoClient.close();
    if (neo4jDriver) await neo4jDriver.close();
    if (redisClient) await redisClient.quit();
  }
}

// Run seeding
seedDatabase().catch(console.error);