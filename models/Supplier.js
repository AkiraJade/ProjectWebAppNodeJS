const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Supplier = sequelize.define('supplier', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true
    },
    contact_person: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'supplier',
    timestamps: false
});

module.exports = Supplier;
