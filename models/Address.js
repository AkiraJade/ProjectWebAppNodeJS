const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Address = sequelize.define('addresses', {
    address_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    label: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Home'
    },
    street_address: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'street'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    province: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    zip_code: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'Philippines'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'customer_addresses',
    timestamps: false
});

module.exports = Address;
