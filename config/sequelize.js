const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'little_mono',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        logging: false, // Turn off database query console spam
        define: {
            timestamps: false, // Disables standard createdAt/updatedAt unless explicitly configured in models
            freezeTableName: true // Keep exact table naming matching schema.sql
        }
    }
);

// Test database connection
sequelize.authenticate()
    .then(() => console.log('Sequelize connected successfully to MariaDB/MySQL.'))
    .catch(err => console.error('Sequelize connection failure:', err));

module.exports = sequelize;
