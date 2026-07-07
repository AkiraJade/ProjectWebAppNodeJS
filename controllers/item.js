const { Item, ItemImage, Category, Tag, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            where: { deleted_at: null },
            include: [
                { model: ItemImage, as: 'images' },
                { model: Category, as: 'category' },
                { model: Tag, as: 'tags' },
                { model: Supplier, as: 'supplier' }
            ]
        });
        
        const rows = items.map(item => {
            const primaryImage = item.images && item.images.find(img => img.is_primary);
            const fallbackImage = item.images && item.images.length > 0 ? item.images[0] : null;
            const mainImagePath = primaryImage ? primaryImage.img_path : (fallbackImage ? fallbackImage.img_path : null);

            return {
                item_id: item.item_id,
                description: item.description,
                cost_price: item.cost_price,
                sell_price: item.sell_price,
                img_path: mainImagePath,
                quantity: item.quantity,
                images: item.images ? item.images.map(img => img.img_path) : [],
                category: item.category ? [item.category.name] : [],
                tags: item.tags ? item.tags.map(t => t.name) : [],
                supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.name, email: item.supplier.email } : null
            };
        });
        
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
                { model: ItemImage, as: 'images' },
                { model: Category, as: 'category' },
                { model: Tag, as: 'tags' },
                { model: Supplier, as: 'supplier' }
            ]
        });

        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        const primaryImage = item.images && item.images.find(img => img.is_primary);
        const fallbackImage = item.images && item.images.length > 0 ? item.images[0] : null;
        const mainImagePath = primaryImage ? primaryImage.img_path : (fallbackImage ? fallbackImage.img_path : null);

        const result = [{
            item_id: item.item_id,
            description: item.description,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            img_path: mainImagePath,
            quantity: item.quantity,
            images: item.images ? item.images.map(img => img.img_path) : [],
            category: item.category ? [item.category.name] : [],
            tags: item.tags ? item.tags.map(t => t.name) : [],
            supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.name, email: item.supplier.email } : null
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
        const { description, cost_price, sell_price, quantity, tags, category, supplier_id } = req.body;
        
        if (!description || !cost_price || !sell_price) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Resolve Category
        let categoryId = 1; // Fallback to 'blind box'
        if (category) {
            let catName = '';
            if (Array.isArray(category) && category.length > 0) {
                catName = category[0];
            } else if (typeof category === 'string') {
                catName = category.split(',')[0].trim();
            }
            if (catName) {
                const [catInstance] = await Category.findOrCreate({
                    where: { name: catName.toLowerCase().trim() },
                    defaults: { description: `${catName} category` },
                    transaction: t
                });
                categoryId = catInstance.id;
            }
        }

        // 2. Resolve Tags
        let tagNames = [];
        if (tags) {
            if (Array.isArray(tags)) {
                tagNames = tags.map(t => t.trim().toLowerCase()).filter(Boolean);
            } else if (typeof tags === 'string') {
                try {
                    const parsed = JSON.parse(tags);
                    if (Array.isArray(parsed)) {
                        tagNames = parsed.map(t => t.trim().toLowerCase()).filter(Boolean);
                    } else {
                        tagNames = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                    }
                } catch (e) {
                    tagNames = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                }
            }
        }

        const tagInstances = [];
        for (const name of tagNames) {
            const [tagInst] = await Tag.findOrCreate({
                where: { name },
                transaction: t
            });
            tagInstances.push(tagInst);
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path.replace(/\\/g, "/"));
        }

        const defaultHeroPath = images.length > 0 ? images[0] : null;

        // 3. Create Item
        const newItem = await Item.create({
            brand_id: 1, // Default to 'Pop Mart'
            category_id: categoryId,
            supplier_id: supplier_id ? parseInt(supplier_id) : null,
            description,
            cost_price,
            sell_price,
            quantity: quantity ? parseInt(quantity) : 0
        }, { transaction: t });

        const itemId = newItem.item_id;

        // 4. Associate Tags
        if (tagInstances.length > 0) {
            await newItem.setTags(tagInstances, { transaction: t });
        }

        // 5. Create Images
        if (images.length > 0) {
            const imageRecords = images.map((path, idx) => ({
                item_id: itemId,
                img_path: path,
                is_primary: idx === 0,
                sort_order: idx
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
        const { description, cost_price, sell_price, quantity, tags, category, supplier_id } = req.body;

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
        const existingSecondary = await ItemImage.findAll({ where: { item_id: id }, transaction: t });
        const allExisting = existingSecondary.map(img => img.img_path).filter(Boolean);
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
            keepImages = uniqueExisting;
        }

        keepImages = keepImages.filter(path => uniqueExisting.includes(path));

        // 3. Process new files
        let newImages = [];
        if (req.files && req.files.length > 0) {
            newImages = req.files.map(file => file.path.replace(/\\/g, "/"));
        }

        // 4. Combine kept images and new images
        const combinedImages = [...keepImages, ...newImages];

        // 5. Resolve Category
        let categoryId = item.category_id;
        if (category) {
            let catName = '';
            if (Array.isArray(category) && category.length > 0) {
                catName = category[0];
            } else if (typeof category === 'string') {
                catName = category.split(',')[0].trim();
            }
            if (catName) {
                const [catInstance] = await Category.findOrCreate({
                    where: { name: catName.toLowerCase().trim() },
                    defaults: { description: `${catName} category` },
                    transaction: t
                });
                categoryId = catInstance.id;
            }
        }

        // 6. Resolve Tags
        let tagNames = [];
        if (tags) {
            if (Array.isArray(tags)) {
                tagNames = tags.map(t => t.trim().toLowerCase()).filter(Boolean);
            } else if (typeof tags === 'string') {
                try {
                    const parsed = JSON.parse(tags);
                    if (Array.isArray(parsed)) {
                        tagNames = parsed.map(t => t.trim().toLowerCase()).filter(Boolean);
                    } else {
                        tagNames = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                    }
                } catch (e) {
                    tagNames = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                }
            }
        }

        const tagInstances = [];
        for (const name of tagNames) {
            const [tagInst] = await Tag.findOrCreate({
                where: { name },
                transaction: t
            });
            tagInstances.push(tagInst);
        }

        const updatedData = {
            description,
            cost_price,
            sell_price,
            category_id: categoryId,
            supplier_id: supplier_id ? parseInt(supplier_id) : null,
            quantity: quantity ? parseInt(quantity) : 0
        };

        await item.update(updatedData, { transaction: t });

        // Update tags
        await item.setTags(tagInstances, { transaction: t });

        // Update Item Images table
        await ItemImage.destroy({ where: { item_id: id }, transaction: t });
        if (combinedImages.length > 0) {
            const imageRecords = combinedImages.map((path, idx) => ({
                item_id: id,
                img_path: path,
                is_primary: idx === 0,
                sort_order: idx
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
            where: { deleted_at: { [Op.ne]: null } }
        });
        
        const rows = items.map(item => ({
            item_id: item.item_id,
            description: item.description,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            img_path: item.img_path,
            quantity: item.quantity
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