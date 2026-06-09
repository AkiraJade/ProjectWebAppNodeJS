const { Review, User, Customer, Orderinfo, Orderline, Transaction } = require('../models');
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

        // Find customer record for the logged-in user
        const customer = await Customer.findOne({ where: { user_id: req.user.id } });

        let canReview = false;
        if (customer) {
            // Check if user has a completed/shipped/paid order containing this item
            const orders = await Orderinfo.findAll({
                where: { customer_id: customer.customer_id },
                include: [
                    {
                        model: Orderline,
                        as: 'lines',
                        where: { item_id: itemId }
                    },
                    {
                        model: Transaction,
                        as: 'transaction',
                        where: { status: { [Op.in]: ['Completed', 'Shipped', 'Paid'] } }
                    }
                ]
            });

            canReview = orders.length > 0;
        }

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
        const customer = await Customer.findOne({ where: { user_id: req.user.id } });

        if (!customer) {
            return res.status(403).json({ error: 'You must purchase this item before reviewing.' });
        }

        const orders = await Orderinfo.findAll({
            where: { customer_id: customer.customer_id },
            include: [
                {
                    model: Orderline,
                    as: 'lines',
                    where: { item_id: itemId }
                },
                {
                    model: Transaction,
                    as: 'transaction',
                    where: { status: { [Op.in]: ['Completed', 'Shipped', 'Paid'] } }
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
