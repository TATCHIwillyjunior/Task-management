// src/controllers/taskController.js
// Person A: Complete Task Controller - MongoDB CRUD Operations
// Handles all task-related database operations

const { getDB, ObjectId, toObjectId } = require('../../db/mongodb_db/mongodb_db');

// ============================================
// CREATE TASK
// ============================================

async function createTask(taskData) {
  try {
    const db = getDB();
    const task = {
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo', // 'todo', 'in-progress', 'done'
      priority: taskData.priority || 'medium', // 'low', 'medium', 'high'
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      projectId: toObjectId(taskData.projectId),
      createdBy: toObjectId(taskData.createdBy),
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('tasks').insertOne(task);
    
    return {
      _id: result.insertedId,
      ...task
    };
  } catch (error) {
    console.error('Error creating task:', error.message);
    throw error;
  }
}

// ============================================
// READ TASKS
// ============================================

async function getAllTasks(filters = {}) {
  try {
    const db = getDB();
    const query = {};

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.projectId) query.projectId = toObjectId(filters.projectId);
    if (filters.priority) query.priority = filters.priority;
    if (filters.createdBy) query.createdBy = toObjectId(filters.createdBy);

    const tasks = await db
      .collection('tasks')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error.message);
    throw error;
  }
}

async function getTaskById(taskId) {
  try {
    const db = getDB();
    const task = await db
      .collection('tasks')
      .findOne({ _id: toObjectId(taskId) });

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    return task;
  } catch (error) {
    console.error('Error getting task:', error.message);
    throw error;
  }
}

// ============================================
// UPDATE TASK
// ============================================

async function updateTask(taskId, updateData) {
  try {
    const db = getDB();
    
    const updateDoc = {
      $set: {
        ...updateData,
        updatedAt: new Date()
      }
    };

    const result = await db
      .collection('tasks')
      .findOneAndUpdate(
        { _id: toObjectId(taskId) },
        updateDoc,
        { returnDocument: 'after' }
      );

    if (!result.value) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    return result.value;
  } catch (error) {
    console.error('Error updating task:', error.message);
    throw error;
  }
}

// ============================================
// DELETE TASK
// ============================================

async function deleteTask(taskId) {
  try {
    const db = getDB();
    
    const result = await db
      .collection('tasks')
      .deleteOne({ _id: toObjectId(taskId) });

    if (result.deletedCount === 0) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error deleting task:', error.message);
    throw error;
  }
}

// ============================================
// COMMENTS
// ============================================

async function addComment(taskId, commentData) {
  try {
    const db = getDB();
    
    const comment = {
      author: toObjectId(commentData.author),
      text: commentData.text,
      createdAt: new Date()
    };

    const result = await db
      .collection('tasks')
      .findOneAndUpdate(
        { _id: toObjectId(taskId) },
        {
          $push: { comments: comment },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    return result.value;
  } catch (error) {
    console.error('Error adding comment:', error.message);
    throw error;
  }
}

async function getComments(taskId) {
  try {
    const db = getDB();
    
    const task = await db
      .collection('tasks')
      .findOne(
        { _id: toObjectId(taskId) },
        { projection: { comments: 1 } }
      );

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    return task.comments || [];
  } catch (error) {
    console.error('Error getting comments:', error.message);
    throw error;
  }
}

// ============================================
// AGGREGATION PIPELINE 1: Dashboard Metrics
// ============================================

async function getDashboardMetrics() {
  try {
    const db = getDB();

    const metrics = await db
      .collection('tasks')
      .aggregate([
        // Stage 1: Match tasks from last 30 days
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },

        // Stage 2: Group by status and calculate metrics
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgCompletionDays: {
              $avg: {
                $divide: [
                  { $subtract: ['$updatedAt', '$createdAt'] },
                  1000 * 60 * 60 * 24
                ]
              }
            },
            avgPriority: {
              $avg: {
                $cond: [
                  { $eq: ['$priority', 'high'] },
                  3,
                  { $cond: [{ $eq: ['$priority', 'medium'] }, 2, 1] }
                ]
              }
            }
          }
        },

        // Stage 3: Project fields with proper names
        {
          $project: {
            _id: 0,
            status: '$_id',
            taskCount: '$count',
            avgCompletionDays: { $round: ['$avgCompletionDays', 1] },
            avgPriorityScore: { $round: ['$avgPriority', 2] }
          }
        },

        // Stage 4: Sort by status
        { $sort: { status: 1 } }
      ])
      .toArray();

    return {
      period: 'Last 30 days',
      timestamp: new Date(),
      metrics: metrics
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error.message);
    throw error;
  }
}

// ============================================
// AGGREGATION PIPELINE 2: Overdue Tasks Alert
// ============================================

async function getOverdueTasksAlert() {
  try {
    const db = getDB();

    const overdueTasks = await db
      .collection('tasks')
      .aggregate([
        // Stage 1: Match overdue, incomplete tasks
        {
          $match: {
            status: { $ne: 'done' },
            dueDate: { $lt: new Date() }
          }
        },

        // Stage 2: Lookup user information
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdByUser'
          }
        },

        // Stage 3: Unwind creator array
        { $unwind: '$createdByUser' },

        // Stage 4: Group by priority
        {
          $group: {
            _id: '$priority',
            overduCount: { $sum: 1 },
            tasks: {
              $push: {
                _id: '$_id',
                title: '$title',
                daysOverdue: {
                  $divide: [
                    { $subtract: [new Date(), '$dueDate'] },
                    1000 * 60 * 60 * 24
                  ]
                },
                createdBy: '$createdByUser.username',
                status: '$status'
              }
            }
          }
        },

        // Stage 5: Sort by priority (high first)
        {
          $sort: { _id: -1 }
        },

        // Stage 6: Project clean output
        {
          $project: {
            _id: 0,
            priority: '$_id',
            overduCount: 1,
            tasks: {
              $map: {
                input: '$tasks',
                as: 'task',
                in: {
                  _id: '$$task._id',
                  title: '$$task.title',
                  daysOverdue: { $round: ['$$task.daysOverdue', 1] },
                  createdBy: '$$task.createdBy',
                  status: '$$task.status'
                }
              }
            }
          }
        }
      ])
      .toArray();

    return {
      alert: 'Overdue Tasks',
      timestamp: new Date(),
      data: overdueTasks
    };
  } catch (error) {
    console.error('Error getting overdue tasks:', error.message);
    throw error;
  }
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getComments,
  getDashboardMetrics,
  getOverdueTasksAlert
};