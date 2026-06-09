const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Orderinfo = sequelize.define('orderinfo', {
    orderinfo_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    date_placed: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    date_shipped: {
        type: DataTypes.DATE,
        allowNull: true
    },
    shipping: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    }
});

module.exports = Orderinfo;
