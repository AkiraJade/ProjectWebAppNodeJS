const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.VIRTUAL,
        get() {
            if (this.customer) {
                return `${this.customer.fname} ${this.customer.lname}`.trim();
            }
            return '';
        },
        set(value) {
            // No-op to prevent crashes during writes
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    role: {
        type: DataTypes.ENUM('admin', 'customer'),
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
}, {
    tableName: 'users',
    timestamps: false
});

module.exports = User;
