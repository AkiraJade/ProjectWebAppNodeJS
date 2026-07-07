const { PurchaseOrder, PurchaseOrderLine, Item, Supplier, sequelize } = require('../models');

// Create a new Purchase Order
exports.createPurchaseOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { supplier_id, notes, items } = req.body;

        if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, error: 'Supplier ID and at least one item are required.' });
        }

        // Verify supplier exists
        const supplier = await Supplier.findByPk(supplier_id, { transaction: t });
        if (!supplier) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'Supplier not found.' });
        }

        // Generate PO number: PO-YYYY-XXXX
        const year = new Date().getFullYear();
        const lastPO = await PurchaseOrder.findOne({
            where: sequelize.where(
                sequelize.fn('YEAR', sequelize.col('created_at')),
                year
            ),
            order: [['id', 'DESC']],
            transaction: t
        });
        const nextNum = lastPO ? (parseInt(lastPO.po_number.split('-')[2]) || 0) + 1 : 1;
        const po_number = `PO-${year}-${String(nextNum).padStart(4, '0')}`;

        // Calculate total cost
        let total_cost = 0;
        for (const lineItem of items) {
            total_cost += (parseFloat(lineItem.unit_cost) || 0) * (parseInt(lineItem.quantity) || 0);
        }

        // Create the purchase order
        const po = await PurchaseOrder.create({
            supplier_id,
            po_number,
            notes: notes || null,
            total_cost
        }, { transaction: t });

        // Create line items and increment stock
        for (const lineItem of items) {
            const qty = parseInt(lineItem.quantity) || 0;
            if (qty <= 0) continue;

            await PurchaseOrderLine.create({
                purchase_order_id: po.id,
                item_id: lineItem.item_id,
                quantity: qty,
                unit_cost: parseFloat(lineItem.unit_cost) || 0
            }, { transaction: t });

            // Auto-increment item stock
            await Item.increment('quantity', {
                by: qty,
                where: { id: lineItem.item_id },
                transaction: t
            });
        }

        await t.commit();

        // Fetch the created PO with lines for the response
        const createdPO = await PurchaseOrder.findByPk(po.id, {
            include: [{
                model: PurchaseOrderLine,
                as: 'lines',
                include: [{ model: Item, as: 'item', attributes: ['id', 'name', 'description'] }]
            }]
        });

        return res.status(201).json({ success: true, purchaseOrder: createdPO });
    } catch (error) {
        await t.rollback();
        console.error('Error creating purchase order:', error);
        return res.status(500).json({ success: false, error: 'Failed to create purchase order.' });
    }
};

// Get Purchase Order history for a supplier
exports.getPurchaseOrders = async (req, res) => {
    try {
        const { supplier_id } = req.query;
        const where = {};
        if (supplier_id) where.supplier_id = supplier_id;

        const orders = await PurchaseOrder.findAll({
            where,
            include: [{
                model: PurchaseOrderLine,
                as: 'lines',
                include: [{ model: Item, as: 'item', attributes: ['id', 'name', 'description'] }]
            }, {
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'name']
            }],
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch purchase orders.' });
    }
};
