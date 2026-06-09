const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Wishlist = sequelize.define('wishlists', {
    wishlist_id: {
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
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'item_id']
        }
    ]
});

module.exports = Wishlist;
