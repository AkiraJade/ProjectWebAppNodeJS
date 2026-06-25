const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Brand = sequelize.define('brand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    logo_path: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'brand',
    timestamps: false
});

module.exports = Brand;
