// src/routes/mongodbRoute/mongodbRoute_users.js

const express = require('express');
const router = express.Router();
const userController = require('../../controllers/MongoDb/userController');

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password' });
    }

    const user = await userController.createUser({ username, email, password, role });
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    if (error.message.includes('duplicate') || error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await userController.getAllUsers();
    res.json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await userController.getUserById(req.params.id);
    res.json({ user });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { username, email, role } = req.body;
    const user = await userController.updateUser(req.params.id, { username, email, role });
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await userController.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

module.exports = router;
