const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Customer = sequelize.define('customer', {
    customer_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    fname: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'first_name'
    },
    lname: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'last_name'
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    image_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'profile_image_path'
    },
    dob: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'customer',
    timestamps: false
});

module.exports = Customer;
