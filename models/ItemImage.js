const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ItemImage = sequelize.define('item_images', {
    image_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    img_path: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'image_path'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'item_images',
    timestamps: false
});

module.exports = ItemImage;
