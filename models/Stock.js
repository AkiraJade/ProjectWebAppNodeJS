const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Stock = sequelize.define('stock', {
    stock_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

module.exports = Stock;
