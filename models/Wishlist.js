const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Wishlist = sequelize.define('wishlist', {
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'wishlist',
    timestamps: false
});

module.exports = Wishlist;
