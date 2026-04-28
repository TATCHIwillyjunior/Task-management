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
