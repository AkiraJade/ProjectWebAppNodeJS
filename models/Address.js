const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Address = sequelize.define('addresses', {
    address_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    street_address: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    city: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    province: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    zip_code: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    country: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
});

module.exports = Address;
