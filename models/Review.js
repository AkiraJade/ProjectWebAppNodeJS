const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Review = sequelize.define('reviews', {
    review_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'review',
    timestamps: false
});

module.exports = Review;
