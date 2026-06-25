const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Transaction = sequelize.define('transactions', {
    transaction_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    orderinfo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    payment_method: {
        type: DataTypes.ENUM('cod', 'gcash', 'card', 'bank_transfer'),
        allowNull: false,
        defaultValue: 'cod'
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
        field: 'payment_status'
    },
    transaction_ref: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    transaction_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    }
}, {
    tableName: 'payments',
    timestamps: false
});

module.exports = Transaction;
