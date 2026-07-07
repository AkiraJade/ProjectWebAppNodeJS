const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PurchaseOrderLine = sequelize.define('PurchaseOrderLine', {
    purchase_order_id: {
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
    unit_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'purchase_order_line',
    timestamps: false
});

module.exports = PurchaseOrderLine;
