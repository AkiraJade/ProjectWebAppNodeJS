const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Orderinfo = sequelize.define('orderinfo', {
    orderinfo_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    address_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    shipping_street: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    shipping_city: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    shipping_province: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    shipping_zip: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    shipping: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 100.00,
        field: 'shipping_fee'
    },
    date_placed: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    date_shipped: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'orderinfo',
    timestamps: false
});

module.exports = Orderinfo;
