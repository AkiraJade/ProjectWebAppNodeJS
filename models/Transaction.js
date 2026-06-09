const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Transaction = sequelize.define('transactions', {
    transaction_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderinfo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_method: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'Pending'
    },
    transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = Transaction;
