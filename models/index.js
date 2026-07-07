const sequelize = require('../config/sequelize');
const User = require('./User');
const Customer = require('./Customer');
const Address = require('./Address');
const Brand = require('./Brand');
const Category = require('./Category');
const Tag = require('./Tag');
const Item = require('./Item');
const ItemImage = require('./ItemImage');
const Orderinfo = require('./Orderinfo');
const Orderline = require('./Orderline');
const Transaction = require('./Transaction');
const Review = require('./Review');
const Wishlist = require('./Wishlist');
const CollectionLog = require('./CollectionLog');
const Supplier = require('./Supplier');

// Define Relationships

// User <-> Customer (One-to-One)
User.hasOne(Customer, { foreignKey: 'user_id', as: 'customer', onDelete: 'CASCADE' });
Customer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Address (One-to-Many)
User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Orderinfo (One-to-Many)
User.hasMany(Orderinfo, { foreignKey: 'user_id', as: 'orders', onDelete: 'RESTRICT' });
Orderinfo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Item <-> Brand (Many-to-One)
Brand.hasMany(Item, { foreignKey: 'brand_id', as: 'items', onDelete: 'RESTRICT' });
Item.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

// Item <-> Category (Many-to-One)
Category.hasMany(Item, { foreignKey: 'category_id', as: 'items', onDelete: 'RESTRICT' });
Item.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Item <-> Supplier (Many-to-One)
Supplier.hasMany(Item, { foreignKey: 'supplier_id', as: 'items', onDelete: 'SET NULL' });
Item.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// Item <-> Tag (Many-to-Many via item_tags pivot table)
Item.belongsToMany(Tag, { through: 'item_tags', foreignKey: 'item_id', otherKey: 'tag_id', as: 'tags' });
Tag.belongsToMany(Item, { through: 'item_tags', foreignKey: 'tag_id', otherKey: 'item_id', as: 'items' });

// Item <-> ItemImage (One-to-Many)
Item.hasMany(ItemImage, { foreignKey: 'item_id', as: 'images', onDelete: 'CASCADE' });
ItemImage.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Orderinfo <-> Orderline (One-to-Many)
Orderinfo.hasMany(Orderline, { foreignKey: 'orderinfo_id', as: 'lines', onDelete: 'CASCADE' });
Orderline.belongsTo(Orderinfo, { foreignKey: 'orderinfo_id', as: 'order' });

// Orderline <-> Item (Many-to-One)
Orderline.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
Item.hasMany(Orderline, { foreignKey: 'item_id', as: 'orderlines' });

// Orderinfo <-> Transaction (One-to-One, mapped to payments table)
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

// User <-> CollectionLog (One-to-Many)
User.hasMany(CollectionLog, { foreignKey: 'user_id', as: 'collectionLogs', onDelete: 'CASCADE' });
CollectionLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Item <-> CollectionLog (One-to-Many)
Item.hasMany(CollectionLog, { foreignKey: 'item_id', as: 'collectionLogs', onDelete: 'CASCADE' });
CollectionLog.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

module.exports = {
    sequelize,
    User,
    Customer,
    Address,
    Brand,
    Category,
    Tag,
    Item,
    ItemImage,
    Orderinfo,
    Orderline,
    Transaction,
    Review,
    Wishlist,
    CollectionLog,
    Supplier
};
