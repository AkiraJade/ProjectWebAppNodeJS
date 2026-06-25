const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Orderline = sequelize.define('orderline', {
    orderinfo_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    sell_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'orderline',
    timestamps: false
});

module.exports = Orderline;
