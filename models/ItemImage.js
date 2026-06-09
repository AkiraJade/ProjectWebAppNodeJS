const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ItemImage = sequelize.define('item_images', {
    image_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    img_path: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
});

module.exports = ItemImage;
