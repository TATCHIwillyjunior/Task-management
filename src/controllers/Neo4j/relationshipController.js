const { getNeo4jDriver, executeQuery, executeWrite, executeRead } = require('../db/neo4j');
//Create Nodes function
async function createUser(userData) {
  try {
    const query = `
      CREATE (u:User {
        id: $id,
        username: $username,
        email: $email
      })
      RETURN u
    `;
    const records = await executeWrite(query, {
      id: userData.id,
      username: userData.username,
      email: userData.email
    });
    return records[0]?.get('u')?.properties;
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
}

async function createTask(taskData) {
  try {
    const query = `
      CREATE (t:Task {
        id: $id,
        title: $title,
        status: $status
      })
      RETURN t
    `;
    const records = await executeWrite(query, {
      id: taskData.id,
      title: taskData.title,
      status: taskData.status
    });

// Assigning task to user 
async function assignTaskToUser(userId, taskId) {
  try {
    const query = `
      MATCH (u:User {id: $userId})
      MATCH (t:Task {id: $taskId})
      CREATE (u)-[:ASSIGNED_TO]->(t)
      RETURN u, t
    `;
    const records = await executeWrite(query, {
      userId: userId,
      taskId: taskId
    });
    if (records.length === 0) {
      throw new Error('User or Task not found');
    }
    return {
      user: records[0]?.get('u')?.properties,
      task: records[0]?.get('t')?.properties
    };
  } catch (error) {
    console.error('Error assigning task:', error.message);
    throw error;
  }
}
//marking task as blocked
async function markTaskAsBlocked(taskId, blockedByTaskId) {
  try {
    const query = `
      MATCH (t:Task {id: $taskId})
      MATCH (b:Task {id: $blockedByTaskId})
      CREATE (t)-[:BLOCKED_BY]->(b)
      RETURN t, b
    `;
    const records = await executeWrite(query, {
      taskId: taskId,
      blockedByTaskId: blockedByTaskId
    });
    return {
      task: records[0]?.get('t')?.properties,
      blockedBy: records[0]?.get('b')?.properties
    };
  } catch (error) {
    console.error('Error marking task as blocked:', error.message);
    throw error;
  }
}
// the path traversal query 1 = task bloacking chain
async function getBlockingTasksChain(taskId) {
  try {
    const query = `
      MATCH (targetTask:Task {id: $taskId})
      OPTIONAL MATCH path = (targetTask)-[:BLOCKED_BY*1..10]->(blocker:Task)
      RETURN 
        targetTask.title AS taskTitle,
        targetTask.id AS taskId,
        COUNT(DISTINCT blocker) AS blockingTaskCount,
        COLLECT(DISTINCT {
          blockingTaskId: blocker.id,
          blockingTaskTitle: blocker.title,
          blockingTaskStatus: blocker.status,
          depth: LENGTH(path)
        }) AS blockingTasks
      ORDER BY blockingTaskCount DESC
    `;
    const records = await executeRead(query, { taskId: taskId });
    if (records.length === 0) {
      return {
        taskTitle: 'Unknown',
        taskId: taskId,
        blockingTaskCount: 0,
        blockingTasks: []
      };
    }
    const result = records[0];
    return {
      taskTitle: result.get('taskTitle'),
      taskId: result.get('taskId'),
      blockingTaskCount: result.get('blockingTaskCount').toNumber(),
      blockingTasks: result.get('blockingTasks')
    };
  } catch (error) {
    console.error('Error getting blocking tasks:', error.message);
    throw error;
  } }
// get user's assign task
async function getUserAssignedTasks(userId) {
  try {
    const query = `
      MATCH (u:User {id: $userId})-[:ASSIGNED_TO]->(t:Task)
      RETURN 
        u.username AS username,
        COLLECT({
          taskId: t.id,
          taskTitle: t.title,
          taskStatus: t.status
        }) AS assignedTasks
    `;

    const records = await executeRead(query, { userId: userId });

    if (records.length === 0) {
      return {
        username: 'Unknown',
        assignedTasks: []
      };
    }

    const result = records[0];
    return {
      username: result.get('username'),
      assignedTasks: result.get('assignedTasks')
    };
  } catch (error) {
    console.error('Error getting user tasks:', error.message);
    throw error;
  }
}