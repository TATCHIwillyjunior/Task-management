///////////////////// keylan
///////// CONTROLLERS
//// taskController.js

// src/controllers/taskController.js
// Person A: Complete Task Controller - MongoDB CRUD Operations
// Handles all task-related database operations

const { getDB, ObjectId, toObjectId } = require('../db/mongodb');

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