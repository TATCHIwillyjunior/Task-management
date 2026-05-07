const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/Redis/redisController');

// Task cache
router.get('/task/:id', async (req, res) => {
  try {
    const data = await ctrl.getCachedTask(req.params.id);
    res.json({ taskId: req.params.id, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/task/:id', async (req, res) => {
  try {
    const result = await ctrl.cacheTaskData(req.params.id, req.body, req.body.ttl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/task/:id', async (req, res) => {
  try {
    const result = await ctrl.invalidateTaskCache(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard cache
router.get('/dashboard', async (req, res) => {
  try {
    const data = await ctrl.getCachedDashboardMetrics();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dashboard', async (req, res) => {
  try {
    const result = await ctrl.cacheDashboardMetrics(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Urgent queue (sorted set)
router.get('/urgent', async (req, res) => {
  try {
    const result = await ctrl.getUrgentTasks(parseInt(req.query.limit) || 20);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/urgent/:id', async (req, res) => {
  try {
    const result = await ctrl.addTaskToUrgentQueue(req.params.id, req.body.score, req.body.ttl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard (sorted set)
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await ctrl.getLeaderboard(parseInt(req.query.top) || 10);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leaderboard/:userId', async (req, res) => {
  try {
    const result = await ctrl.updateUserLeaderboard(req.params.userId, req.body.tasksCompleted);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activity feed (list)
router.get('/activity/:userId', async (req, res) => {
  try {
    const result = await ctrl.getUserActivityFeed(req.params.userId, parseInt(req.query.limit) || 20);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/activity/:userId', async (req, res) => {
  try {
    const { type, data } = req.body;
    const result = await ctrl.addActivityLog(req.params.userId, type, data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sessions (strings)
router.get('/session/:id', async (req, res) => {
  try {
    const data = await ctrl.getSession(req.params.id);
    res.json({ sessionId: req.params.id, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/session/:id', async (req, res) => {
  try {
    const result = await ctrl.storeSession(req.params.id, req.body, req.body.ttl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/session/:id', async (req, res) => {
  try {
    const result = await ctrl.invalidateSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tags (sets)
router.get('/tag/:name', async (req, res) => {
  try {
    const result = await ctrl.getTasksByTag(req.params.name);
    res.json({ tag: req.params.name, tasks: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tag/:name', async (req, res) => {
  try {
    const result = await ctrl.addTaskToTag(req.params.name, req.body.taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User profile cache (hashes)
router.get('/user/:userId/profile', async (req, res) => {
  try {
    const data = await ctrl.getCachedUserProfile(req.params.userId);
    res.json({ userId: req.params.userId, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/user/:userId/profile', async (req, res) => {
  try {
    const result = await ctrl.cacheUserProfile(req.params.userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats & health
router.get('/stats', async (req, res) => {
  try {
    const result = await ctrl.getRedisStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    const result = await ctrl.getRedisHealth();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/flush', async (req, res) => {
  try {
    const result = await ctrl.flushAllCache();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
