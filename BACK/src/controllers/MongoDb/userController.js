// src/controllers/MongoDb/userController.js
// MongoDB CRUD operations for users

const { getDB, toObjectId } = require('../../db/mongodb_db/mongodb_db');

async function createUser(userData) {
  try {
    const db = getDB();
    const user = {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'member',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(user);
    return { _id: result.insertedId, ...user };
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
}

async function getAllUsers() {
  try {
    const db = getDB();
    const users = await db
      .collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return users;
  } catch (error) {
    console.error('Error getting users:', error.message);
    throw error;
  }
}

async function getUserById(userId) {
  try {
    const db = getDB();
    const user = await db
      .collection('users')
      .findOne({ _id: toObjectId(userId) });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return user;
  } catch (error) {
    console.error('Error getting user:', error.message);
    throw error;
  }
}

async function updateUser(userId, updateData) {
  try {
    const db = getDB();

    const result = await db.collection('users').findOneAndUpdate(
      { _id: toObjectId(userId) },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return result.value;
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  }
}

async function deleteUser(userId) {
  try {
    const db = getDB();

    const result = await db
      .collection('users')
      .deleteOne({ _id: toObjectId(userId) });

    if (result.deletedCount === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error deleting user:', error.message);
    throw error;
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};