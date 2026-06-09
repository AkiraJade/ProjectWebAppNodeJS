const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Customer = sequelize.define('customer', {
    customer_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    fname: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    lname: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    addressline: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    zipcode: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    image_path: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    dob: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
});

module.exports = Customer;
