// src/routes/tasks.js
// Person A: Complete Task Routes with all endpoints

const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/MongoDb/taskController');

// ============================================
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

// GET /api/tasks - Get all tasks with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, projectId, priority, createdBy } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (projectId) filters.projectId = projectId;
    if (priority) filters.priority = priority;
    if (createdBy) filters.createdBy = createdBy;

    const tasks = await taskController.getAllTasks(filters);

    res.json({
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get tasks',
      message: error.message
    });
  }
});

// GET /api/tasks/:id - Get specific task
router.get('/:id', async (req, res) => {
  try {
    const task = await taskController.getTaskById(req.params.id);

    res.json({
      task
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.status(500).json({
      error: 'Failed to get task',
      message: error.message
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      dueDate: req.body.dueDate
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key =>
      updateData[key] === undefined && delete updateData[key]
    );

    const task = await taskController.updateTask(req.params.id, updateData);

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.status(500).json({
      error: 'Failed to update task',
      message: error.message
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const result = await taskController.deleteTask(req.params.id);

    res.json({
      message: 'Task deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.status(500).json({
      error: 'Failed to delete task',
      message: error.message
    });
  }
});

// ============================================
// COMMENTS ENDPOINTS
// ============================================

// POST /api/tasks/:id/comment - Add comment
router.post('/:id/comment', async (req, res) => {
  try {
    const { author, text } = req.body;

    if (!author || !text) {
      return res.status(400).json({
        error: 'Missing required fields: author, text'
      });
    }

    const task = await taskController.addComment(req.params.id, {
      author,
      text
    });

    res.json({
      message: 'Comment added successfully',
      task
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.status(500).json({
      error: 'Failed to add comment',
      message: error.message
    });
  }
});

// GET /api/tasks/:id/comments - Get task comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await taskController.getComments(req.params.id);

    res.json({
      taskId: req.params.id,
      commentCount: comments.length,
      comments
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.status(500).json({
      error: 'Failed to get comments',
      message: error.message
    });
  }
});

// ============================================
// AGGREGATION ENDPOINTS
// ============================================

// GET /api/tasks/analytics/dashboard - Dashboard metrics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const metrics = await taskController.getDashboardMetrics();

    res.json({
      type: 'dashboard_metrics',
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get dashboard metrics',
      message: error.message
    });
  }
});

// GET /api/tasks/analytics/overdue - Overdue tasks alert
router.get('/analytics/overdue', async (req, res) => {
  try {
    const overdue = await taskController.getOverdueTasksAlert();

    res.json({
      type: 'overdue_tasks_alert',
      data: overdue
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get overdue tasks',
      message: error.message
    });
  }
});

module.exports = router;