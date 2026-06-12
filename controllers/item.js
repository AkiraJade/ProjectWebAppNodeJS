const { Item, Stock, ItemImage, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            where: { deleted_at: null },
            include: [
                { model: Stock, as: 'stock' },
                { model: ItemImage, as: 'images' }
            ]
        });
        
        const rows = items.map(item => ({
            item_id: item.item_id,
            description: item.description,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            img_path: item.img_path,
            quantity: item.stock ? item.stock.quantity : 0,
            images: item.images ? item.images.map(img => img.img_path) : [],
            category: item.category ? item.category.split(',').map(c => c.trim()) : [],
            tags: item.tags ? item.tags.split(',').map(t => t.trim()) : []
        }));
        
        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch items.' });
    }
};

exports.getSingleItem = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            include: [
                { model: Stock, as: 'stock' },
                { model: ItemImage, as: 'images' }
            ]
        });

        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const result = [{
            item_id: item.item_id,
            description: item.description,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            img_path: item.img_path,
            quantity: item.stock ? item.stock.quantity : 0,
            images: item.images ? item.images.map(img => img.img_path) : [],
            category: item.category ? item.category.split(',').map(c => c.trim()) : [],
            tags: item.tags ? item.tags.split(',').map(t => t.trim()) : []
        }];

        return res.status(200).json({ success: true, result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch item.' });
    }
};

exports.createItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { description, cost_price, sell_price, quantity, tags, category } = req.body;
        
        if (!description || !cost_price || !sell_price) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let categoryStr = null;
        if (category) {
            if (Array.isArray(category)) {
                categoryStr = category.map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
            } else {
                try {
                    const parsed = JSON.parse(category);
                    if (Array.isArray(parsed)) {
                        categoryStr = parsed.map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
                    } else {
                        categoryStr = String(category).split(',').map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
                    }
                } catch (e) {
                    categoryStr = String(category).split(',').map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
                }
            }
        }

        let tagsStr = null;
        if (tags) {
            if (Array.isArray(tags)) {
                tagsStr = tags.map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
            } else {
                try {
                    const parsed = JSON.parse(tags);
                    if (Array.isArray(parsed)) {
                        tagsStr = parsed.map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
                    } else {
                        tagsStr = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
                    }
                } catch (e) {
                    tagsStr = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
                }
            }
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path.replace(/\\/g, "/"));
        }

        const defaultHeroPath = images.length > 0 ? images[0] : null;

        const newItem = await Item.create({
            description,
            cost_price,
            sell_price,
            img_path: defaultHeroPath,
            category: categoryStr,
            tags: tagsStr
        }, { transaction: t });

        const itemId = newItem.item_id;

        await Stock.create({
            item_id: itemId,
            quantity: quantity ? parseInt(quantity) : 0
        }, { transaction: t });

        if (images.length > 0) {
            const imageRecords = images.map(path => ({
                item_id: itemId,
                img_path: path
            }));
            await ItemImage.bulkCreate(imageRecords, { transaction: t });
        }

        await t.commit();
        return res.status(201).json({
            success: true,
            itemId,
            image: defaultHeroPath,
            images,
            quantity
        });
    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Failed to create item', details: error.message });
    }
};

exports.updateItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const id = req.params.id;
        const { description, cost_price, sell_price, quantity, tags, category } = req.body;

        if (!description || !cost_price || !sell_price) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await Item.findByPk(id, { transaction: t });
        if (!item) {
            await t.rollback();
            return res.status(404).json({ error: 'Item not found' });
        }

        // 1. Gather all existing unique image paths for validation
        const existingHero = item.img_path;
        const existingSecondary = await ItemImage.findAll({ where: { item_id: id }, transaction: t });
        const allExisting = [existingHero, ...existingSecondary.map(img => img.img_path)].filter(Boolean);
        const uniqueExisting = [...new Set(allExisting)];

        // 2. Parse keep_images from request body
        let keepImages = [];
        if (req.body.keep_images) {
            try {
                keepImages = JSON.parse(req.body.keep_images);
            } catch (e) {
                if (Array.isArray(req.body.keep_images)) {
                    keepImages = req.body.keep_images;
                } else {
                    keepImages = [req.body.keep_images];
                }
            }
        } else {
            // Default: if keep_images parameter is missing, keep all existing images to maintain backwards compatibility
            keepImages = uniqueExisting;
        }

        // Keep only images that actually belonged to the item (prevent injection)
        keepImages = keepImages.filter(path => uniqueExisting.includes(path));

        // 3. Process new files
        let newImages = [];
        if (req.files && req.files.length > 0) {
            newImages = req.files.map(file => file.path.replace(/\\/g, "/"));
        }

        // 4. Combine kept images and new images
        const combinedImages = [...keepImages, ...newImages];

        let categoryStr = null;
        if (category) {
            if (Array.isArray(category)) {
                categoryStr = category.map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
            } else {
                try {
                    const parsed = JSON.parse(category);
                    if (Array.isArray(parsed)) {
                        categoryStr = parsed.map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
                    } else {
                        categoryStr = String(category).split(',').map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
                    }
                } catch (e) {
                    categoryStr = String(category).split(',').map(c => c.trim().toLowerCase()).filter(Boolean).join(',');
                }
            }
        }

        let tagsStr = null;
        if (tags) {
            if (Array.isArray(tags)) {
                tagsStr = tags.map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
            } else {
                try {
                    const parsed = JSON.parse(tags);
                    if (Array.isArray(parsed)) {
                        tagsStr = parsed.map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
                    } else {
                        tagsStr = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
                    }
                } catch (e) {
                    tagsStr = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',');
                }
            }
        }

        const updatedData = {
            description,
            cost_price,
            sell_price,
            img_path: combinedImages.length > 0 ? combinedImages[0] : null,
            category: categoryStr,
            tags: tagsStr
        };

        await item.update(updatedData, { transaction: t });

        // Update Stock
        const stock = await Stock.findOne({ where: { item_id: id }, transaction: t });
        if (stock) {
            await stock.update({ quantity: quantity ? parseInt(quantity) : 0 }, { transaction: t });
        } else {
            await Stock.create({ item_id: id, quantity: quantity ? parseInt(quantity) : 0 }, { transaction: t });
        }

        // Update Item Images table
        await ItemImage.destroy({ where: { item_id: id }, transaction: t });
        if (combinedImages.length > 0) {
            const imageRecords = combinedImages.map(path => ({
                item_id: id,
                img_path: path
            }));
            await ItemImage.bulkCreate(imageRecords, { transaction: t });
        }

        await t.commit();
        return res.status(201).json({ success: true });
    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Failed to update item', details: error.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const id = req.params.id;
        const item = await Item.findByPk(id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        await item.update({ deleted_at: new Date() });
        return res.status(201).json({ success: true, message: 'item soft-deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to delete item', details: error.message });
    }
};

exports.restoreItem = async (req, res) => {
    try {
        const id = req.params.id;
        const item = await Item.findByPk(id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        await item.update({ deleted_at: null });
        return res.status(200).json({ success: true, message: 'Item restored successfully.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to restore item.', details: error.message });
    }
};

exports.getDeletedItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            where: { deleted_at: { [Op.ne]: null } },
            include: [
                { model: Stock, as: 'stock' }
            ]
        });
        
        const rows = items.map(item => ({
            item_id: item.item_id,
            description: item.description,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            img_path: item.img_path,
            quantity: item.stock ? item.stock.quantity : 0
        }));
        
        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch deleted items.' });
    }
};

exports.searchItems = async (req, res) => {
    try {
        const query = req.query.q || '';
        const list = await Item.findAll({
            where: {
                description: {
                    [Op.like]: `%${query}%`
                },
                deleted_at: null
            },
            limit: 10
        });
        return res.status(200).json({ items: list });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Search failed' });
    }
};