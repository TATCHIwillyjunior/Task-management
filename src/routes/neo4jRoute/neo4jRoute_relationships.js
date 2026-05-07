const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/Neo4j/relationshipController');

// Assign task to user
router.post('/assign', async (req, res) => {
  try {
    const { userId, taskId } = req.body;
    const result = await ctrl.assignTaskToUser(userId, taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark task as blocked by another
router.post('/block', async (req, res) => {
  try {
    const { taskId, blockedByTaskId } = req.body;
    const result = await ctrl.markTaskAsBlocked(taskId, blockedByTaskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add user to project
router.post('/project/member', async (req, res) => {
  try {
    const { userId, projectId } = req.body;
    const result = await ctrl.addUserToProject(userId, projectId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add skill to user
router.post('/skill', async (req, res) => {
  try {
    const { userId, skillName } = req.body;
    const result = await ctrl.addUserSkill(userId, skillName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set user manager
router.post('/manager', async (req, res) => {
  try {
    const { userId, managerId } = req.body;
    const result = await ctrl.setUserManager(userId, managerId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's assigned tasks
router.get('/user/:userId/tasks', async (req, res) => {
  try {
    const result = await ctrl.getUserAssignedTasks(req.params.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get blocking chain for a task
router.get('/task/:taskId/blocking', async (req, res) => {
  try {
    const result = await ctrl.getBlockingTasksChain(req.params.taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project team
router.get('/project/:projectId/team', async (req, res) => {
  try {
    const result = await ctrl.getProjectTeam(req.params.projectId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recommend person for a task by required skill
router.get('/recommend', async (req, res) => {
  try {
    const { skill, excludeUserId } = req.query;
    if (!skill) return res.status(400).json({ error: 'skill query param required' });
    const result = await ctrl.recommendPersonForTask(skill, excludeUserId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
