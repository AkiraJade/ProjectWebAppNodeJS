const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

exports.addressChart = async (req, res) => {
    try {
        const rows = await sequelize.query(
            'SELECT COUNT(addressline) AS total, addressline FROM customer GROUP BY addressline ORDER BY total DESC',
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
            'SELECT MONTHNAME(oi.date_placed) AS month, SUM(ol.quantity * i.sell_price) AS total FROM orderinfo oi INNER JOIN orderline ol ON oi.orderinfo_id = ol.orderinfo_id INNER JOIN item i ON i.item_id = ol.item_id GROUP BY MONTH(oi.date_placed)',
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
            'SELECT i.description AS items, SUM(ol.quantity) AS total FROM item i INNER JOIN orderline ol ON i.item_id = ol.item_id GROUP BY i.description',
            { type: QueryTypes.SELECT }
        );
        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve items metrics.' });
    }
};