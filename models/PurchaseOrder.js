const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    po_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'purchase_order',
    timestamps: false
});

module.exports = PurchaseOrder;
