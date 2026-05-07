// src/controllers/Redis/redisController.js --->  Check
// dev-willy: Complete Redis Controller - Caching & Data Structures
// Handles all Redis operations (strings, hashes, sorted sets, lists, sets)

const { 
  getRedisClient, 
  set, get, del, exists, getKeys,
  hSet, hGetAll,
  zAdd, zRange,
  lPush, lRange,
  sAdd, sMembers,
  incr, flushAll
} = require('../../db/redis_db/redis_db.js');

// ============================================
// CACHE MANAGEMENT
// ============================================

async function cacheTaskData(taskId, taskData, ttlSeconds = 300) {
  try {
    const key = `task:${taskId}`;
    await set(key, taskData, ttlSeconds);
    return { success: true, key, ttl: ttlSeconds };
  } catch (error) {
    console.error('Error caching task data:', error.message);
    throw error;
  }
}

async function getCachedTask(taskId) {
  try {
    const key = `task:${taskId}`;
    const data = await get(key);
    return data;
  } catch (error) {
    console.error('Error getting cached task:', error.message);
    throw error;
  }
}

async function invalidateTaskCache(taskId) {
  try {
    const key = `task:${taskId}`;
    await del(key);
    return { success: true, invalidated: key };
  } catch (error) {
    console.error('Error invalidating task cache:', error.message);
    throw error;
  }
}

// ============================================
// DASHBOARD CACHING (Aggregation Results)
// ============================================

async function cacheDashboardMetrics(metrics, ttlSeconds = 1800) {
  try {
    const key = 'dashboard:metrics';
    await set(key, metrics, ttlSeconds);
    return { success: true, key, ttl: ttlSeconds };
  } catch (error) {
    console.error('Error caching dashboard metrics:', error.message);
    throw error;
  }
}

async function getCachedDashboardMetrics() {
  try {
    const key = 'dashboard:metrics';
    const data = await get(key);
    return data;
  } catch (error) {
    console.error('Error getting cached dashboard metrics:', error.message);
    throw error;
  }
}

// ============================================
// URGENCY SCORE SORTED SET
// ============================================

async function addTaskToUrgentQueue(taskId, urgencyScore, ttlSeconds = 300) {
  try {
    const key = 'tasks:urgent';
    
    // Add to sorted set (score determines order)
    const client = getRedisClient();
    await client.zAdd(key, { score: urgencyScore, value: taskId });
    
    // Set expiration
    await client.expire(key, ttlSeconds);
    
    return { success: true, taskId, score: urgencyScore };
  } catch (error) {
    console.error('Error adding to urgent queue:', error.message);
    throw error;
  }
}

async function getUrgentTasks(limit = 20) {
  try {
    const key = 'tasks:urgent';
    
    // Get top N tasks (highest scores first)
    const client = getRedisClient();
    const tasks = await client.zRange(key, 0, limit - 1, {
      WITHSCORES: true,
      REV: true // Reverse order (highest first)
    });

    // Format response
    const formatted = [];
    for (let i = 0; i < tasks.length; i += 2) {
      formatted.push({
        taskId: tasks[i],
        urgencyScore: parseFloat(tasks[i + 1])
      });
    }

    return formatted;
  } catch (error) {
    console.error('Error getting urgent tasks:', error.message);
    throw error;
  }
}

// ============================================
// LEADERBOARD (User Productivity Ranking)
// ============================================

async function updateUserLeaderboard(userId, tasksCompleted) {
  try {
    const key = 'leaderboard:users';
    const client = getRedisClient();
    
    // Add/update user score (number of completed tasks)
    await client.zIncrBy(key, tasksCompleted, userId);
    
    // Set expiration (24 hours)
    await client.expire(key, 86400);
    
    return { success: true, userId, tasksCompleted };
  } catch (error) {
    console.error('Error updating leaderboard:', error.message);
    throw error;
  }
}

async function getLeaderboard(topN = 10) {
  try {
    const key = 'leaderboard:users';
    const client = getRedisClient();
    
    // Get top N users (highest scores first)
    const leaderboard = await client.zRange(key, 0, topN - 1, {
      WITHSCORES: true,
      REV: true
    });

    // Format response
    const formatted = [];
    for (let i = 0; i < leaderboard.length; i += 2) {
      formatted.push({
        rank: Math.floor(i / 2) + 1,
        userId: leaderboard[i],
        tasksCompleted: parseInt(leaderboard[i + 1])
      });
    }

    return formatted;
  } catch (error) {
    console.error('Error getting leaderboard:', error.message);
    throw error;
  }
}

// ============================================
// ACTIVITY FEED (Lists)
// ============================================

async function addActivityLog(userId, activityType, activityData) {
  try {
    const key = `activity:${userId}`;
    const client = getRedisClient();
    
    const logEntry = {
      type: activityType,
      data: activityData,
      timestamp: new Date().toISOString()
    };

    // Add to list (most recent first with LPUSH)
    await client.lPush(key, JSON.stringify(logEntry));
    
    // Keep only last 100 entries
    await client.lTrim(key, 0, 99);
    
    // Set expiration (7 days)
    await client.expire(key, 604800);
    
    return { success: true, userId, logged: logEntry };
  } catch (error) {
    console.error('Error adding activity log:', error.message);
    throw error;
  }
}

async function getUserActivityFeed(userId, limit = 20) {
  try {
    const key = `activity:${userId}`;
    const client = getRedisClient();
    
    // Get recent activities
    const activities = await client.lRange(key, 0, limit - 1);
    
    return activities.map(activity => JSON.parse(activity));
  } catch (error) {
    console.error('Error getting activity feed:', error.message);
    throw error;
  }
}

// ============================================
// SESSION STORAGE (Strings)
// ============================================

async function storeSession(sessionId, sessionData, ttlSeconds = 86400) {
  try {
    const key = `session:${sessionId}`;
    await set(key, sessionData, ttlSeconds);
    return { success: true, sessionId, ttl: ttlSeconds };
  } catch (error) {
    console.error('Error storing session:', error.message);
    throw error;
  }
}

async function getSession(sessionId) {
  try {
    const key = `session:${sessionId}`;
    const data = await get(key);
    return data;
  } catch (error) {
    console.error('Error getting session:', error.message);
    throw error;
  }
}

async function invalidateSession(sessionId) {
  try {
    const key = `session:${sessionId}`;
    await del(key);
    return { success: true, invalidated: sessionId };
  } catch (error) {
    console.error('Error invalidating session:', error.message);
    throw error;
  }
}

// ============================================
// TAGS & CATEGORIES (Sets)
// ============================================

async function addTaskToTag(tagName, taskId) {
  try {
    const key = `tag:${tagName}`;
    const client = getRedisClient();
    
    await client.sAdd(key, taskId);
    await client.expire(key, 86400);
    
    return { success: true, tag: tagName, taskId };
  } catch (error) {
    console.error('Error adding task to tag:', error.message);
    throw error;
  }
}

async function getTasksByTag(tagName) {
  try {
    const key = `tag:${tagName}`;
    const client = getRedisClient();
    
    const tasks = await client.sMembers(key);
    return tasks;
  } catch (error) {
    console.error('Error getting tasks by tag:', error.message);
    throw error;
  }
}

// ============================================
// USER PROFILE CACHE (Hashes)
// ============================================

async function cacheUserProfile(userId, userData) {
  try {
    const key = `user:${userId}`;
    const client = getRedisClient();
    
    // Store as hash (more efficient for object data)
    await client.hSet(key, userData);
    await client.expire(key, 600); // 10 minutes
    
    return { success: true, userId };
  } catch (error) {
    console.error('Error caching user profile:', error.message);
    throw error;
  }
}

async function getCachedUserProfile(userId) {
  try {
    const key = `user:${userId}`;
    const client = getRedisClient();
    
    const data = await client.hGetAll(key);
    return data && Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error('Error getting cached user profile:', error.message);
    throw error;
  }
}

// ============================================
// COUNTER OPERATIONS
// ============================================

async function incrementViewCount(taskId) {
  try {
    const key = `views:${taskId}`;
    const client = getRedisClient();
    
    const count = await client.incr(key);
    await client.expire(key, 86400);
    
    return { taskId, viewCount: count };
  } catch (error) {
    console.error('Error incrementing view count:', error.message);
    throw error;
  }
}

// ============================================
// HEALTH CHECK
// ============================================

async function getRedisHealth() {
  try {
    const client = getRedisClient();
    const info = await client.info('stats');
    
    return {
      status: 'healthy',
      connected: client.isOpen,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================
// CLEANUP & RESET
// ============================================

async function flushAllCache() {
  try {
    await flushAll();
    return { success: true, message: 'All Redis keys flushed' };
  } catch (error) {
    console.error('Error flushing cache:', error.message);
    throw error;
  }
}

async function getRedisStats() {
  try {
    const client = getRedisClient();
    const keys = await getKeys('*');
    
    return {
      totalKeys: keys.length,
      keys: keys.slice(0, 50), // Return first 50 keys
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting Redis stats:', error.message);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  // Task caching
  cacheTaskData,
  getCachedTask,
  invalidateTaskCache,
  
  // Dashboard
  cacheDashboardMetrics,
  getCachedDashboardMetrics,
  
  // Urgent queue (sorted sets)
  addTaskToUrgentQueue,
  getUrgentTasks,
  
  // Leaderboard (sorted sets)
  updateUserLeaderboard,
  getLeaderboard,
  
  // Activity feed (lists)
  addActivityLog,
  getUserActivityFeed,
  
  // Sessions (strings)
  storeSession,
  getSession,
  invalidateSession,
  
  // Tags (sets)
  addTaskToTag,
  getTasksByTag,
  
  // User profiles (hashes)
  cacheUserProfile,
  getCachedUserProfile,
  
  // Counters
  incrementViewCount,
  
  // Health & stats
  getRedisHealth,
  getRedisStats,
  flushAllCache
};