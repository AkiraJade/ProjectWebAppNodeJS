const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Tag = sequelize.define('tag', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'tag',
    timestamps: false
});

module.exports = Tag;
