// src/routes/mongodbRoute/mongodbRoute_tasks.js
// peron A Complete task routes for MongoDB
// Task crud routes for MongoDB
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

//============================================
// TASK CRUD ENDPOINTS
// ============================================

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, projectId, createdBy } = req.body;

    // Validation
    if (!title || !projectId || !createdBy) {
      return res.status(400).json({
        error: 'Missing required fields: title, projectId, createdBy'
      });
    }

    const task = await taskController.createTask({
      title,
      description,
      status,
      priority,
      dueDate,
      projectId,
      createdBy
    });

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create task',
      message: error.message
    });
  }
});