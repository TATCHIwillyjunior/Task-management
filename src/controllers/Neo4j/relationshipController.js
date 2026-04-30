const { getNeo4jDriver, executeQuery, executeWrite, executeRead } = require('../db/neo4j');
//Create Nodes function
async function createUser(userData) {
  try {
    const query = `
      CREATE (u:User {
        id: $id,
        username: $username,
        email: $email
      })
      RETURN u
    `;
    const records = await executeWrite(query, {
      id: userData.id,
      username: userData.username,
      email: userData.email
    });
    return records[0]?.get('u')?.properties;
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
}

async function createTask(taskData) {
  try {
    const query = `
      CREATE (t:Task {
        id: $id,
        title: $title,
        status: $status
      })
      RETURN t
    `;
    const records = await executeWrite(query, {
      id: taskData.id,
      title: taskData.title,
      status: taskData.status
    });

