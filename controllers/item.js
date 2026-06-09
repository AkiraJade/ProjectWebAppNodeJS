const { Item, Stock, ItemImage, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
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
            images: item.images ? item.images.map(img => img.img_path) : []
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
            images: item.images ? item.images.map(img => img.img_path) : []
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
        const { description, cost_price, sell_price, quantity } = req.body;
        
        if (!description || !cost_price || !sell_price) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
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
            img_path: defaultHeroPath
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
        const { description, cost_price, sell_price, quantity } = req.body;

        if (!description || !cost_price || !sell_price) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await Item.findByPk(id, { transaction: t });
        if (!item) {
            await t.rollback();
            return res.status(404).json({ error: 'Item not found' });
        }

        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => file.path.replace(/\\/g, "/"));
        }

        const updatedData = {
            description,
            cost_price,
            sell_price
        };

        if (images.length > 0) {
            updatedData.img_path = images[0];
        }

        await item.update(updatedData, { transaction: t });

        const stock = await Stock.findOne({ where: { item_id: id }, transaction: t });
        if (stock) {
            await stock.update({ quantity: quantity ? parseInt(quantity) : 0 }, { transaction: t });
        } else {
            await Stock.create({ item_id: id, quantity: quantity ? parseInt(quantity) : 0 }, { transaction: t });
        }

        if (images.length > 0) {
            await ItemImage.destroy({ where: { item_id: id }, transaction: t });
            const imageRecords = images.map(path => ({
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
        await item.destroy();
        return res.status(201).json({ success: true, message: 'item deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to delete item', details: error.message });
    }
};

exports.searchItems = async (req, res) => {
    try {
        const query = req.query.q || '';
        const list = await Item.findAll({
            where: {
                description: {
                    [Op.like]: `%${query}%`
                }
            },
            limit: 10
        });
        return res.status(200).json({ items: list });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Search failed' });
    }
};