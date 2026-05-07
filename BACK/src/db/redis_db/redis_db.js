// src/db/redis.js
// Person C: Redis connection using native client (NO ORM)
// Week 1 Task: Create connection and set up Redis client

const redis = require('redis');

let client = null;

// ============================================
// REDIS CONNECTION
// ============================================

async function connectRedis() {
  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    console.log('Connecting to Redis...');
    console.log(`URL: ${url}`);

    client = redis.createClient({
      url: url,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis reconnection failed after 10 attempts');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        }
      }
    });

    // Error handling
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Connect to Redis
    await client.connect();

    // Test the connection
    const pong = await client.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis connection verified');
    }

    return client;
  } catch (error) {
    console.error('❌ Redis connection error:', error.message);
    throw error;
  }
}

// ============================================
// GETTERS
// ============================================

function getRedisClient() {
  if (!client) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  return client;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Set a key-value pair with optional expiration
 * @param {string} key - Redis key
 * @param {string|object} value - Value (will be stringified if object)
 * @param {number} ttl - Time to live in seconds (optional)
 */
async function set(key, value, ttl = null) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (ttl) {
      await client.setEx(key, ttl, stringValue);
    } else {
      await client.set(key, stringValue);
    }
    
    return true;
  } catch (error) {
    console.error(`Error setting Redis key ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get a value by key
 * @param {string} key - Redis key
 * @returns {string|object|null}
 */
async function get(key) {
  try {
    const value = await client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not JSON
    }
  } catch (error) {
    console.error(`Error getting Redis key ${key}:`, error.message);
    throw error;
  }
}

/**
 * Delete a key
 * @param {string} key - Redis key
 */
async function del(key) {
  try {
    return await client.del(key);
  } catch (error) {
    console.error(`Error deleting Redis key ${key}:`, error.message);
    throw error;
  }
}

/**
 * Delete multiple keys
 * @param {string[]} keys - Array of Redis keys
 */
async function delMultiple(keys) {
  try {
    if (keys.length === 0) return 0;
    return await client.del(keys);
  } catch (error) {
    console.error('Error deleting Redis keys:', error.message);
    throw error;
  }
}

/**
 * Check if key exists
 * @param {string} key - Redis key
 */
async function exists(key) {
  try {
    return await client.exists(key) === 1;
  } catch (error) {
    console.error(`Error checking Redis key ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get all keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., "task:*")
 */
async function getKeys(pattern) {
  try {
    return await client.keys(pattern);
  } catch (error) {
    console.error(`Error getting Redis keys with pattern ${pattern}:`, error.message);
    throw error;
  }
}

/**
 * Set a hash
 * @param {string} key - Redis key
 * @param {object} hashObject - Object with key-value pairs
 */
async function hSet(key, hashObject) {
  try {
    return await client.hSet(key, hashObject);
  } catch (error) {
    console.error(`Error setting Redis hash ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get a hash
 * @param {string} key - Redis key
 */
async function hGetAll(key) {
  try {
    return await client.hGetAll(key);
  } catch (error) {
    console.error(`Error getting Redis hash ${key}:`, error.message);
    throw error;
  }
}

/**
 * Add to a sorted set
 * @param {string} key - Redis key
 * @param {object} members - Object with member: score pairs
 */
async function zAdd(key, members) {
  try {
    const args = [];
    for (const [member, score] of Object.entries(members)) {
      args.push({ score, value: member });
    }
    return await client.zAdd(key, args);
  } catch (error) {
    console.error(`Error adding to Redis sorted set ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get range from sorted set
 * @param {string} key - Redis key
 * @param {number} start - Start index
 * @param {number} stop - Stop index
 * @param {boolean} withScores - Include scores
 */
async function zRange(key, start = 0, stop = -1, withScores = false) {
  try {
    if (withScores) {
      return await client.zRange(key, start, stop, { WITHSCORES: true });
    }
    return await client.zRange(key, start, stop);
  } catch (error) {
    console.error(`Error getting range from Redis sorted set ${key}:`, error.message);
    throw error;
  }
}

/**
 * Add to a list
 * @param {string} key - Redis key
 * @param {string} value - Value to push
 */
async function lPush(key, value) {
  try {
    return await client.lPush(key, value);
  } catch (error) {
    console.error(`Error pushing to Redis list ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get list range
 * @param {string} key - Redis key
 * @param {number} start - Start index
 * @param {number} stop - Stop index
 */
async function lRange(key, start = 0, stop = -1) {
  try {
    return await client.lRange(key, start, stop);
  } catch (error) {
    console.error(`Error getting range from Redis list ${key}:`, error.message);
    throw error;
  }
}

/**
 * Add to a set
 * @param {string} key - Redis key
 * @param {string|string[]} members - Member(s) to add
 */
async function sAdd(key, members) {
  try {
    const memberArray = Array.isArray(members) ? members : [members];
    return await client.sAdd(key, memberArray);
  } catch (error) {
    console.error(`Error adding to Redis set ${key}:`, error.message);
    throw error;
  }
}

/**
 * Get all members of a set
 * @param {string} key - Redis key
 */
async function sMembers(key) {
  try {
    return await client.sMembers(key);
  } catch (error) {
    console.error(`Error getting Redis set ${key}:`, error.message);
    throw error;
  }
}

/**
 * Increment a value
 * @param {string} key - Redis key
 */
async function incr(key) {
  try {
    return await client.incr(key);
  } catch (error) {
    console.error(`Error incrementing Redis key ${key}:`, error.message);
    throw error;
  }
}

/**
 * Flush all keys (use with caution!)
 */
async function flushAll() {
  try {
    console.log('⚠️  Flushing all Redis keys...');
    await client.flushAll();
    console.log('✅ Redis flushed');
  } catch (error) {
    console.error('Error flushing Redis:', error.message);
    throw error;
  }
}

// ============================================
// DISCONNECT
// ============================================

async function disconnectRedis() {
  try {
    if (client) {
      await client.quit();
      client = null;
      console.log('✅ Redis disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting Redis:', error.message);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  // String operations
  set,
  get,
  del,
  delMultiple,
  exists,
  getKeys,
  incr,
  // Hash operations
  hSet,
  hGetAll,
  // Sorted set operations
  zAdd,
  zRange,
  // List operations
  lPush,
  lRange,
  // Set operations
  sAdd,
  sMembers,
  // Utility
  flushAll
};