const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Item = sequelize.define('item', {
    item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    cost_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    sell_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    img_path: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
});

module.exports = Item;
