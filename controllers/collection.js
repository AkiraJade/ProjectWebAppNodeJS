const { CollectionLog, Item, ItemImage, Category, sequelize } = require('../models');
const { Op } = require('sequelize');

// 1. Get User's Collection & Unboxing Logs
exports.getCollectionLog = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const logs = await CollectionLog.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: Item,
                    as: 'item',
                    include: [{ model: ItemImage, as: 'images' }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Format logs for response
        const formattedLogs = logs.map(log => {
            const item = log.item || {};
            const primaryImage = item.images && item.images.find(img => img.is_primary);
            const fallbackImage = item.images && item.images.length > 0 ? item.images[0] : null;
            const mainImagePath = primaryImage ? primaryImage.img_path : (fallbackImage ? fallbackImage.img_path : null);

            return {
                id: log.id,
                item_id: log.item_id,
                description: item.description || 'Unknown Figurine',
                edition_type: item.edition_type || 'Standard',
                probability: item.probability || '1/12',
                status: log.status,
                purchase_date: log.purchase_date,
                seller: log.seller,
                price: log.price ? parseFloat(log.price).toFixed(2) : null,
                display_condition: log.display_condition,
                img_path: mainImagePath,
                created_at: log.created_at
            };
        });

        return res.status(200).json({ success: true, count: formattedLogs.length, logs: formattedLogs });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Failed to retrieve collection log: ' + error.message });
    }
};

// 2. Add Figurine to Collection/Unboxing Log
exports.addCollectionLog = async (req, res) => {
    try {
        const userId = req.user.id;
        const { item_id, status, purchase_date, seller, price, display_condition } = req.body;

        if (!item_id) {
            return res.status(400).json({ success: false, error: 'Item ID is required.' });
        }

        // Verify item exists
        const item = await Item.findByPk(item_id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found.' });
        }

        // Check if log already exists with this status to avoid DB violation
        const existing = await CollectionLog.findOne({
            where: {
                user_id: userId,
                item_id,
                status: status || 'owned'
            }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: `This figurine is already marked as "${status || 'owned'}" in your collection.`
            });
        }

        const log = await CollectionLog.create({
            user_id: userId,
            item_id,
            status: status || 'owned',
            purchase_date: purchase_date || null,
            seller: seller || null,
            price: price ? parseFloat(price) : null,
            display_condition: display_condition || 'Mint',
        });

        return res.status(201).json({ success: true, message: 'Figurine added to collection successfully!', log });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Failed to add figurine to collection: ' + error.message });
    }
};

// 3. Update Collection/Unboxing Log Entry
exports.updateCollectionLog = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { status, purchase_date, seller, price, display_condition } = req.body;

        const log = await CollectionLog.findOne({
            where: { id, user_id: userId }
        });

        if (!log) {
            return res.status(404).json({ success: false, error: 'Collection log entry not found.' });
        }

        // If status is changing, check for unique constraint check
        if (status && status !== log.status) {
            const duplicate = await CollectionLog.findOne({
                where: {
                    user_id: userId,
                    item_id: log.item_id,
                    status
                }
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    error: `You already have an entry for this figurine with the status "${status}".`
                });
            }
        }

        await log.update({
            status: status || log.status,
            purchase_date: purchase_date !== undefined ? purchase_date : log.purchase_date,
            seller: seller !== undefined ? seller : log.seller,
            price: price !== undefined ? (price ? parseFloat(price) : null) : log.price,
            display_condition: display_condition !== undefined ? display_condition : log.display_condition
        });

        return res.status(200).json({ success: true, message: 'Collection entry updated successfully!', log });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Failed to update collection entry: ' + error.message });
    }
};

// 4. Delete Collection/Unboxing Log Entry
exports.deleteCollectionLog = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const log = await CollectionLog.findOne({
            where: { id, user_id: userId }
        });

        if (!log) {
            return res.status(404).json({ success: false, error: 'Collection entry not found.' });
        }

        await log.destroy();
        return res.status(200).json({ success: true, message: 'Collection entry deleted successfully.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Failed to delete collection entry: ' + error.message });
    }
};

// 5. Calculate Series Completion Progress (unboxing metrics per category)
exports.getSeriesProgress = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch all categories
        const categories = await Category.findAll();

        const progressList = [];

        for (const cat of categories) {
            // Count total active items in this category
            const totalItems = await Item.count({
                where: { category_id: cat.id, deleted_at: null }
            });

            if (totalItems === 0) continue; // Skip categories with no figurines

            // Count unique owned items in this category by this user
            const ownedItems = await CollectionLog.count({
                where: {
                    user_id: userId,
                    status: 'owned'
                },
                include: [
                    {
                        model: Item,
                        as: 'item',
                        where: { category_id: cat.id, deleted_at: null },
                        required: true
                    }
                ]
            });

            const percentage = parseFloat(((ownedItems / totalItems) * 100).toFixed(2));

            progressList.push({
                category_id: cat.id,
                category_name: cat.name,
                total_items: totalItems,
                owned_items: ownedItems,
                percentage
            });
        }

        return res.status(200).json({ success: true, progress: progressList });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Failed to retrieve series progress: ' + error.message });
    }
};
