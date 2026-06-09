const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.STRING(50),
        defaultValue: 'customer'
    },
    token: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = User;
