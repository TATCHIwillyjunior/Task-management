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
// get user's assigned task
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
//function to add user to project
async function addUserToProject(userId, projectId) {
  try {
    const query = `
      MATCH (u:User {id: $userId})
      MATCH (p:Project {id: $projectId})
      CREATE (u)-[:MEMBER_OF]->(p)
      RETURN u, p
    `;
    const records = await executeWrite(query, {
      userId: userId,
      projectId: projectId
    });
    return {
      user: records[0]?.get('u')?.properties,
      project: records[0]?.get('p')?.properties
    };
  } catch (error) {
    console.error('Error adding user to project:', error.message);
    throw error;
  }
}
//get project team
async function getProjectTeam(projectId) {
  try {
    const query = `
      MATCH (p:Project {id: $projectId})<-[:MEMBER_OF]-(u:User)
      RETURN
        p.name AS projectName,
        COLLECT({
          userId: u.id,
          username: u.username,
          email: u.email
        }) AS teamMembers
    `;
    const records = await executeRead(query, { projectId: projectId });
    if (records.length === 0) {
      return {
        projectName: 'Unknown',
        teamMembers: []
      };
    }
    const result = records[0];
    return {
      projectName: result.get('projectName'),
      teamMembers: result.get('teamMembers')
    };
  } catch (error) {
    console.error('Error getting project team:', error.message);
    throw error;
  }
}
//function for path traversal query 2=skill-based recommendation 
async function recommendPersonForTask(skillRequired, excludeUserId = null) {
  try {
    let query = `
      MATCH (requiredSkill:Skill {name: $skillRequired})
      OPTIONAL MATCH (candidate:User)-[:HAS_SKILL]->(requiredSkill)
      
      OPTIONAL MATCH (candidate)-[:ASSIGNED_TO]->(assignedTask:Task)
      WHERE assignedTask.status <> "done"
      
      OPTIONAL MATCH (candidate)-[:REPORTS_TO]->(manager:User)
      
      WITH candidate, manager,
           COUNT(DISTINCT assignedTask) AS currentWorkload
      
      WHERE candidate IS NOT NULL
    `;
    if (excludeUserId) {
      query += ` AND candidate.id <> $excludeUserId`;
    }
    query += `
      RETURN 
        candidate.username AS username,
        candidate.id AS userId,
        candidate.email AS email,
        currentWorkload AS workload,
        COLLECT(DISTINCT assignedTask.title)[0..3] AS currentTasks,
        manager.username AS reportsTo,
        CASE 
          WHEN currentWorkload < 3 THEN "AVAILABLE"
          WHEN currentWorkload < 6 THEN "MODERATE"
          ELSE "OVERLOADED"
        END AS workloadStatus,
        (10 - currentWorkload) AS recommendationScore
      
      ORDER BY 
        currentWorkload ASC,
        candidate.username ASC
      
      LIMIT 5
    `;
    const params = { skillRequired: skillRequired };
    if (excludeUserId) {
      params.excludeUserId = excludeUserId;
    }
    const records = await executeRead(query, params);
    return records.map(record => ({
      username: record.get('username'),
      userId: record.get('userId'),
      email: record.get('email'),
      workload: record.get('workload').toNumber(),
      currentTasks: record.get('currentTasks'),
      reportsTo: record.get('reportsTo'),
      workloadStatus: record.get('workloadStatus'),
      recommendationScore: record.get('recommendationScore')
    }));
  } catch (error) {
    console.error('Error recommending person:', error.message);
    throw error;
  }
}
// function for user skill relationship
async function addUserSkill(userId, skillName) {
  try {
    const query = `
      MATCH (u:User {id: $userId})
      MERGE (s:Skill {name: $skillName})
      CREATE (u)-[:HAS_SKILL]->(s)
      RETURN u, s
    `;
    const records = await executeWrite(query, {
      userId: userId,
      skillName: skillName
    });
    return {
      user: records[0]?.get('u')?.properties,
      skill: records[0]?.get('s')?.properties
    };
  } catch (error) {
    console.error('Error adding user skill:', error.message);
    throw error;
  }}
// function to report hierarchy
async function setUserManager(userId, managerId) {
  try {
    const query = `
      MATCH (u:User {id: $userId})
      MATCH (m:User {id: $managerId})
      CREATE (u)-[:REPORTS_TO]->(m)
      RETURN u, m
    `;
    const records = await executeWrite(query, {
      userId: userId,
      managerId: managerId
    });
    return {
      user: records[0]?.get('u')?.properties,
      manager: records[0]?.get('m')?.properties
    };
  } catch (error) {
    console.error('Error setting user manager:', error.message);
    throw error;
  }}
// export
module.exports = {
  createUser,
  createTask,
  assignTaskToUser,
  markTaskAsBlocked,
  getBlockingTasksChain,
  getUserAssignedTasks,
  addUserToProject,
  getProjectTeam,
  recommendPersonForTask,
  addUserSkill,
  setUserManager
};