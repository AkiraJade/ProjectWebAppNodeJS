const { Review, User, Customer, Orderinfo, Orderline, Transaction, Item, ItemImage } = require('../models');
const { Op } = require('sequelize');

exports.getItemReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { item_id: req.params.id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'name'] }
            ]
        });

        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
};

exports.canReview = async (req, res) => {
    try {
        const itemId = req.params.id;

        // Check if user has a completed/shipped/paid order containing this item
        const orders = await Orderinfo.findAll({
            where: { 
                user_id: req.user.id,
                [Op.or]: [
                    { status_id: { [Op.in]: [3, 4] } }, // Shipped or Delivered
                    { '$transaction.payment_status$': 'paid' } // Paid
                ]
            },
            include: [
                {
                    model: Orderline,
                    as: 'lines',
                    where: { item_id: itemId }
                },
                {
                    model: Transaction,
                    as: 'transaction',
                    required: true
                }
            ]
        });

        const canReview = orders.length > 0;

        // Check if user has already reviewed this item
        const existingReview = await Review.findOne({
            where: { user_id: req.user.id, item_id: itemId }
        });
        const hasReviewed = !!existingReview;

        return res.status(200).json({ canReview, hasReviewed });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to check review eligibility.' });
    }
};

exports.createReview = async (req, res) => {
    try {
        const itemId = req.params.id;
        const { rating, comment } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        // Check if user already reviewed this item
        const existingReview = await Review.findOne({
            where: { user_id: req.user.id, item_id: itemId }
        });
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this item.' });
        }

        // Check if user has purchased this item (canReview logic)
        const orders = await Orderinfo.findAll({
            where: { 
                user_id: req.user.id,
                [Op.or]: [
                    { status_id: { [Op.in]: [3, 4] } }, // Shipped or Delivered
                    { '$transaction.payment_status$': 'paid' } // Paid
                ]
            },
            include: [
                {
                    model: Orderline,
                    as: 'lines',
                    where: { item_id: itemId }
                },
                {
                    model: Transaction,
                    as: 'transaction',
                    required: true
                }
            ]
        });

        if (orders.length === 0) {
            return res.status(403).json({ error: 'You must purchase this item before reviewing.' });
        }

        const review = await Review.create({
            user_id: req.user.id,
            item_id: itemId,
            rating,
            comment: comment || null
        });

        return res.status(201).json({ success: true, review });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to create review.' });
    }
};

exports.getToRateItems = async (req, res) => {
    try {
        // 1. Get all items purchased in completed/shipped/paid orders
        const orders = await Orderinfo.findAll({
            where: {
                user_id: req.user.id,
                [Op.or]: [
                    { status_id: { [Op.in]: [3, 4] } }, // Shipped or Delivered
                    { '$transaction.payment_status$': 'paid' } // Paid
                ]
            },
            include: [
                {
                    model: Orderline,
                    as: 'lines',
                    include: [
                        {
                            model: Item,
                            as: 'item',
                            include: [{ model: ItemImage, as: 'images' }]
                        }
                    ]
                },
                {
                    model: Transaction,
                    as: 'transaction',
                    required: true
                }
            ]
        });

        // 2. Gather unique items
        const purchasedItemMap = new Map();
        orders.forEach(order => {
            if (order.lines && order.lines.length > 0) {
                order.lines.forEach(line => {
                    if (line.item && !line.item.deleted_at) {
                        purchasedItemMap.set(line.item.item_id, line.item);
                    }
                });
            }
        });

        const purchasedItemIds = Array.from(purchasedItemMap.keys());
        if (purchasedItemIds.length === 0) {
            return res.status(200).json({ success: true, items: [] });
        }

        // 3. Find items already reviewed by this user
        const reviews = await Review.findAll({
            where: {
                user_id: req.user.id,
                item_id: { [Op.in]: purchasedItemIds }
            }
        });
        const reviewedItemIds = new Set(reviews.map(r => r.item_id));

        // 4. Filter purchased items to find those NOT reviewed
        const toRateItems = [];
        purchasedItemMap.forEach((item, id) => {
            if (!reviewedItemIds.has(id)) {
                const primaryImage = item.images && item.images.find(img => img.is_primary);
                const fallbackImage = item.images && item.images.length > 0 ? item.images[0] : null;
                const mainImagePath = primaryImage ? primaryImage.img_path : (fallbackImage ? fallbackImage.img_path : null);

                toRateItems.push({
                    item_id: item.item_id,
                    description: item.description,
                    img_path: mainImagePath,
                    sell_price: item.sell_price
                });
            }
        });

        return res.status(200).json({ success: true, items: toRateItems });
    } catch (error) {
        console.error('Error fetching to-rate items:', error);
        return res.status(500).json({ error: 'Failed to fetch items to rate.' });
    }
};
