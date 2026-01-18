const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * PostgreSQL Database Configuration
 * 
 * Rationale:
 * - PostgreSQL chosen for robust relational integrity and ACID compliance
 * - Sequelize ORM provides abstraction layer for database operations
 * - Connection pooling enables efficient resource management for concurrent users
 * - Logging disabled in production for performance optimization
 */

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      // Future production setup would include SSL
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false
      // }
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };