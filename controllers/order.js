const { Orderinfo, Orderline, Customer, User, Item, Stock, Transaction, sequelize } = require('../models');
const sendEmail = require('../utils/sendEmail');

exports.createOrder = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { cart, user } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'Cart is empty' });
        }

        if (!user || !user.id) {
            await t.rollback();
            return res.status(400).json({ error: 'User details missing' });
        }

        // Get Customer profile and associated User email
        const customer = await Customer.findOne({
            where: { user_id: parseInt(user.id) },
            include: [{ model: User, as: 'user' }],
            transaction: t
        });

        if (!customer) {
            await t.rollback();
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        const customerId = customer.customer_id;
        const email = customer.user ? customer.user.email : null;

        const dateOrdered = new Date();
        const dateShipped = new Date(); // matching legacy dateShipped logic
        const shippingFee = 100.00; // matching legacy flat shipping rate

        // Calculate total amount & verify stocks
        let orderTotal = 0;
        
        for (const item of cart) {
            const dbItem = await Item.findByPk(item.item_id, {
                include: [{ model: Stock, as: 'stock' }],
                transaction: t
            });

            if (!dbItem) {
                await t.rollback();
                return res.status(404).json({ error: `Item with ID ${item.item_id} not found` });
            }

            // Check if stock is sufficient
            if (!dbItem.stock || dbItem.stock.quantity < item.quantity) {
                await t.rollback();
                return res.status(400).json({ error: `Insufficient stock for figurine: ${dbItem.description}` });
            }

            orderTotal += parseFloat(dbItem.sell_price) * item.quantity;
        }

        // 1. Create orderinfo header
        const order = await Orderinfo.create({
            customer_id: customerId,
            date_placed: dateOrdered,
            date_shipped: dateShipped,
            shipping: shippingFee
        }, { transaction: t });

        const orderId = order.orderinfo_id;

        // 2. Create order lines and decrement stock
        for (const item of cart) {
            await Orderline.create({
                orderinfo_id: orderId,
                item_id: item.item_id,
                quantity: item.quantity
            }, { transaction: t });

            // Decrement Stock
            const stock = await Stock.findOne({
                where: { item_id: item.item_id },
                transaction: t
            });
            await stock.update({
                quantity: stock.quantity - item.quantity
            }, { transaction: t });
        }

        // 3. Create payment Transaction record (LM Term Test requirement)
        const totalWithShipping = orderTotal + shippingFee;
        const newTransaction = await Transaction.create({
            orderinfo_id: orderId,
            amount: totalWithShipping,
            payment_method: 'Cash on Delivery',
            status: 'Pending',
            transaction_date: dateOrdered
        }, { transaction: t });

        await t.commit();

        // 4. Send success email
        if (email) {
            try {
                await sendEmail({
                    email,
                    subject: 'Order Success — Little Mono',
                    message: `Hi ${customer.fname || 'Collector'}, your figurine order #${orderId} has been successfully placed! Your transaction #${newTransaction.transaction_id} is pending verification.`
                });
            } catch (emailErr) {
                console.error('Email notification failed:', emailErr);
            }
        }

        return res.status(201).json({
            success: true,
            order_id: orderId,
            dateOrdered,
            message: 'transaction complete',
            cart
        });
    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Failed to place order: ' + error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Find the customer profile
        const customer = await Customer.findOne({
            where: { user_id: userId }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        // 2. Fetch all orders for this customer, including their transactions and line items
        const orders = await Orderinfo.findAll({
            where: { customer_id: customer.customer_id },
            include: [
                {
                    model: Transaction,
                    as: 'transaction'
                },
                {
                    model: Orderline,
                    as: 'lines',
                    include: [{ model: Item, as: 'item' }]
                }
            ],
            order: [['date_placed', 'DESC']]
        });

        // 3. Calculate statistics
        const totalOrders = orders.length;
        let totalSpent = 0;
        orders.forEach(order => {
            if (order.transaction) {
                totalSpent += parseFloat(order.transaction.amount || 0);
            }
        });

        // Calculate dynamic loyalty points (e.g., 50 base points + 1 point per $10 spent)
        const loyaltyPoints = 50 + Math.round(totalSpent * 0.1);

        // Determine collection rank
        let collectionRank = 'Novice';
        if (totalOrders >= 8) {
            collectionRank = 'Master Collector';
        } else if (totalOrders >= 4) {
            collectionRank = 'Collector';
        } else if (totalOrders >= 1) {
            collectionRank = 'Apprentice';
        }

        // Map order list for client presentation
        const orderList = orders.map(order => {
            const tx = order.transaction || {};
            const lines = order.lines || [];
            
            return {
                order_id: order.orderinfo_id,
                date_placed: order.date_placed,
                shipping: order.shipping,
                amount: tx.amount || 0,
                payment_method: tx.payment_method || 'N/A',
                status: tx.status || 'Pending',
                items: lines.map(l => ({
                    item_id: l.item_id,
                    description: l.item ? l.item.description : 'Unknown Toy',
                    quantity: l.quantity,
                    price: l.item ? l.item.sell_price : 0,
                    img_path: l.item ? l.item.img_path : null
                }))
            };
        });

        return res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                totalSpent,
                loyaltyPoints,
                collectionRank
            },
            orders: orderList
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve orders summary: ' + error.message });
    }
};