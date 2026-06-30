const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Item = sequelize.define('item', {
    item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'description'
    },
    cost_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    sell_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    edition_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Standard'
    },
    probability: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: '1/12'
    }
}, {
    tableName: 'item',
    timestamps: false
});

module.exports = Item;
