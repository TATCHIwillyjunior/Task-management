// src/controllers/MongoDb/projectController.js
// MongoDB CRUD operations for projects

const { getDB, toObjectId } = require('../../db/mongodb_db/mongodb_db');

async function createProject(projectData) {
  try {
    const db = getDB();
    const project = {
      name: projectData.name,
      description: projectData.description || '',
      createdBy: toObjectId(projectData.createdBy),
      members: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('projects').insertOne(project);
    return { _id: result.insertedId, ...project };
  } catch (error) {
    console.error('Error creating project:', error.message);
    throw error;
  }
}

async function getAllProjects(filters = {}) {
  try {
    const db = getDB();
    const query = {};

    if (filters.createdBy) query.createdBy = toObjectId(filters.createdBy);

    const projects = await db
      .collection('projects')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return projects;
  } catch (error) {
    console.error('Error getting projects:', error.message);
    throw error;
  }
}

async function getProjectById(projectId) {
  try {
    const db = getDB();
    const project = await db
      .collection('projects')
      .findOne({ _id: toObjectId(projectId) });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    return project;
  } catch (error) {
    console.error('Error getting project:', error.message);
    throw error;
  }
}

async function updateProject(projectId, updateData) {
  try {
    const db = getDB();

    const result = await db.collection('projects').findOneAndUpdate(
      { _id: toObjectId(projectId) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    return result.value;
  } catch (error) {
    console.error('Error updating project:', error.message);
    throw error;
  }
}

async function deleteProject(projectId) {
  try {
    const db = getDB();

    const result = await db
      .collection('projects')
      .deleteOne({ _id: toObjectId(projectId) });

    if (result.deletedCount === 0) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error deleting project:', error.message);
    throw error;
  }
}

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject
};