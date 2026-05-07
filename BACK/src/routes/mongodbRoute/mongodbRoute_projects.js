// src/routes/mongodbRoute/mongodbRoute_projects.js

const express = require('express');
const router = express.Router();
const projectController = require('../../controllers/MongoDb/projectController');

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Missing required fields: name, createdBy' });
    }

    const project = await projectController.createProject({ name, description, createdBy });
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project', message: error.message });
  }
});

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const filters = {};
    if (req.query.createdBy) filters.createdBy = req.query.createdBy;

    const projects = await projectController.getAllProjects(filters);
    res.json({ count: projects.length, projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get projects', message: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await projectController.getProjectById(req.params.id);
    res.json({ project });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to get project', message: error.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await projectController.updateProject(req.params.id, { name, description });
    res.json({ message: 'Project updated successfully', project });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to update project', message: error.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await projectController.deleteProject(req.params.id);
    res.json({ message: 'Project deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: 'Failed to delete project', message: error.message });
  }
});

module.exports = router;