const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

exports.addressChart = async (req, res) => {
    try {
        const rows = await sequelize.query(
            'SELECT COUNT(city) AS total, city AS addressline FROM customer_addresses GROUP BY city ORDER BY total DESC',
            { type: QueryTypes.SELECT }
        );
        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve address metrics.' });
    }
};

exports.salesChart = async (req, res) => {
    try {
        const rows = await sequelize.query(
            'SELECT MONTHNAME(oi.date_placed) AS month, SUM(ol.quantity * ol.sell_price) AS total, SUM(ol.quantity) AS volume FROM orderinfo oi INNER JOIN orderline ol ON oi.id = ol.orderinfo_id GROUP BY MONTH(oi.date_placed), MONTHNAME(oi.date_placed) ORDER BY MONTH(oi.date_placed) ASC',
            { type: QueryTypes.SELECT }
        );
        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve sales metrics.' });
    }
};

exports.itemsChart = async (req, res) => {
    try {
        const rows = await sequelize.query(
            'SELECT i.description AS items, SUM(ol.quantity) AS total FROM item i INNER JOIN orderline ol ON i.id = ol.item_id GROUP BY i.description',
            { type: QueryTypes.SELECT }
        );
        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve items metrics.' });
    }
};

exports.getDashboardSummary = async (req, res) => {
    try {
        // 1. Total revenue (Sum of order line amounts + shipping for paid payments)
        const revenueResult = await sequelize.query(
            `SELECT SUM(order_totals.total) AS total FROM (
                SELECT oi.id, SUM(ol.quantity * ol.sell_price) + oi.shipping_fee AS total 
                FROM payments p 
                INNER JOIN orderinfo oi ON p.orderinfo_id = oi.id 
                INNER JOIN orderline ol ON oi.id = ol.orderinfo_id 
                WHERE p.payment_status IN ('paid') 
                GROUP BY oi.id
            ) AS order_totals`,
            { type: QueryTypes.SELECT }
        );
        const totalRevenue = parseFloat(revenueResult[0]?.total || 0);

        // 2. Total active users (role = 'customer', not deleted)
        const usersResult = await sequelize.query(
            "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND role = 'customer'",
            { type: QueryTypes.SELECT }
        );
        const totalUsers = parseInt(usersResult[0]?.total || 0);

        // 3. Total active figurines (not deleted)
        const figurinesResult = await sequelize.query(
            "SELECT COUNT(*) AS total FROM item WHERE deleted_at IS NULL",
            { type: QueryTypes.SELECT }
        );
        const totalFigurines = parseInt(figurinesResult[0]?.total || 0);

        // 4. Total transactions
        const txResult = await sequelize.query(
            "SELECT COUNT(*) AS total FROM payments",
            { type: QueryTypes.SELECT }
        );
        const totalTransactions = parseInt(txResult[0]?.total || 0);

        // 5. Low stock list and count (stock quantity <= 5)
        const lowStockResult = await sequelize.query(
            `SELECT i.id AS item_id, i.description, i.sell_price, i.quantity, im.image_path AS img_path 
             FROM item i 
             LEFT JOIN item_images im ON i.id = im.item_id AND im.is_primary = TRUE 
             WHERE i.deleted_at IS NULL AND i.quantity <= 5 
             ORDER BY i.quantity ASC`,
            { type: QueryTypes.SELECT }
        );

        // 6. Recent activities (latest 5 payments, aggregating order amounts)
        const recentActivities = await sequelize.query(
            `SELECT p.id AS transaction_id, 
                    p.payment_status AS status, 
                    p.created_at AS transaction_date, 
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                    (SELECT SUM(ol.quantity * ol.sell_price) + oi.shipping_fee 
                     FROM orderline ol 
                     WHERE ol.orderinfo_id = oi.id) AS amount 
             FROM payments p 
             INNER JOIN orderinfo oi ON p.orderinfo_id = oi.id 
             INNER JOIN customer c ON oi.user_id = c.user_id 
             ORDER BY p.created_at DESC 
             LIMIT 5`,
            { type: QueryTypes.SELECT }
        );

        return res.status(200).json({
            success: true,
            summary: {
                totalRevenue,
                totalUsers,
                totalFigurines,
                totalTransactions,
                lowStockCount: lowStockResult.length,
                lowStockItems: lowStockResult,
                recentActivities
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve dashboard summary metrics.' });
    }
};