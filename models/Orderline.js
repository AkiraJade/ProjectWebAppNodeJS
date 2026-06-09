const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Orderline = sequelize.define('orderline', {
    orderline_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderinfo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = Orderline;
