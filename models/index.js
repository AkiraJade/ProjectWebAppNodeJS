const sequelize = require('../config/sequelize');
const User = require('./User');
const Customer = require('./Customer');
const Address = require('./Address');
const Item = require('./Item');
const ItemImage = require('./ItemImage');
const Stock = require('./Stock');
const Orderinfo = require('./Orderinfo');
const Orderline = require('./Orderline');
const Transaction = require('./Transaction');
const Review = require('./Review');
const Wishlist = require('./Wishlist');

// Define Relationships

// User <-> Customer (One-to-One)
User.hasOne(Customer, { foreignKey: 'user_id', as: 'customer', onDelete: 'CASCADE' });
Customer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Address (One-to-Many)
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Customer <-> Orderinfo (One-to-Many)
Customer.hasMany(Orderinfo, { foreignKey: 'customer_id', as: 'orders', onDelete: 'CASCADE' });
Orderinfo.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

// Item <-> Stock (One-to-One)
Item.hasOne(Stock, { foreignKey: 'item_id', as: 'stock', onDelete: 'CASCADE' });
Stock.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Item <-> ItemImage (One-to-Many)
Item.hasMany(ItemImage, { foreignKey: 'item_id', as: 'images', onDelete: 'CASCADE' });
ItemImage.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Orderinfo <-> Orderline (One-to-Many)
Orderinfo.hasMany(Orderline, { foreignKey: 'orderinfo_id', as: 'lines', onDelete: 'CASCADE' });
Orderline.belongsTo(Orderinfo, { foreignKey: 'orderinfo_id', as: 'order' });

// Orderline <-> Item (Many-to-One)
Orderline.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
Item.hasMany(Orderline, { foreignKey: 'item_id', as: 'orderlines' });

// Orderinfo <-> Transaction (One-to-One)
Orderinfo.hasOne(Transaction, { foreignKey: 'orderinfo_id', as: 'transaction', onDelete: 'CASCADE' });
Transaction.belongsTo(Orderinfo, { foreignKey: 'orderinfo_id', as: 'order' });

// User <-> Review (One-to-Many)
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Item <-> Review (One-to-Many)
Item.hasMany(Review, { foreignKey: 'item_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// User <-> Wishlist (One-to-Many)
User.hasMany(Wishlist, { foreignKey: 'user_id', as: 'wishlists', onDelete: 'CASCADE' });
Wishlist.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Item <-> Wishlist (One-to-Many)
Item.hasMany(Wishlist, { foreignKey: 'item_id', as: 'wishlists', onDelete: 'CASCADE' });
Wishlist.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

module.exports = {
    sequelize,
    User,
    Customer,
    Address,
    Item,
    ItemImage,
    Stock,
    Orderinfo,
    Orderline,
    Transaction,
    Review,
    Wishlist
};
