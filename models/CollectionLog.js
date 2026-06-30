const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CollectionLog = sequelize.define('collection_logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('owned', 'seeking', 'trading'),
        allowNull: false,
        defaultValue: 'owned'
    },
    purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null
    },
    seller: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
    },
    display_condition: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'collection_logs',
    timestamps: false
});

module.exports = CollectionLog;
