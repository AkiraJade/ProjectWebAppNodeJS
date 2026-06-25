const { Orderinfo, Orderline, Customer, User, Item, Address, Transaction, sequelize } = require('../models');
const sendEmail = require('../utils/sendEmail');

function mapPaymentMethod(method) {
    const m = String(method).toLowerCase();
    if (m.includes('gcash')) return 'gcash';
    if (m.includes('card') || m.includes('credit') || m.includes('debit') || m.includes('paypal')) return 'card';
    if (m.includes('bank') || m.includes('transfer')) return 'bank_transfer';
    return 'cod';
}

exports.createOrder = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { cart, user, payment_method } = req.body;

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

        // Update customer profile with latest checkout details if provided
        const { fname, lname, phone, shipping_address } = req.body;
        await customer.update({
            fname: fname || customer.fname,
            lname: lname || customer.lname,
            phone: phone || customer.phone
        }, { transaction: t });

        // Resolve Address
        let address = null;
        if (req.body.address_id) {
            address = await Address.findByPk(req.body.address_id, { transaction: t });
        }

        if (!address) {
            address = await Address.findOne({
                where: { user_id: parseInt(user.id), is_default: true },
                transaction: t
            });

            if (!address) {
                address = await Address.findOne({
                    where: { user_id: parseInt(user.id) },
                    transaction: t
                });
            }

            if (!address && shipping_address) {
                address = await Address.create({
                    user_id: parseInt(user.id),
                    label: 'Checkout Address',
                    street_address: shipping_address,
                    city: req.body.city || 'Manila',
                    province: req.body.province || 'Metro Manila',
                    zip_code: req.body.zip_code || '1000',
                    country: req.body.country || 'Philippines',
                    is_default: true
                }, { transaction: t });
            }
        }

        const shippingStreet = address ? address.street_address : (shipping_address || '123 Main St');
        const shippingCity = address ? address.city : (req.body.city || 'Manila');
        const shippingProvince = address ? address.province : (req.body.province || 'Metro Manila');
        const shippingZip = address ? address.zip_code : (req.body.zip_code || '1000');
        const shippingFee = 100.00; // Flat shipping rate

        // Verify stocks and calculate total
        let orderTotal = 0;
        for (const item of cart) {
            const dbItem = await Item.findByPk(item.item_id, { transaction: t });

            if (!dbItem) {
                await t.rollback();
                return res.status(404).json({ error: `Item with ID ${item.item_id} not found` });
            }

            if (dbItem.quantity < item.quantity) {
                await t.rollback();
                return res.status(400).json({ error: `Insufficient stock for figurine: ${dbItem.description}` });
            }

            orderTotal += parseFloat(dbItem.sell_price) * item.quantity;
        }

        // 1. Create orderinfo header (referencing user_id and address_id)
        const order = await Orderinfo.create({
            user_id: parseInt(user.id),
            address_id: address ? address.address_id : 1,
            status_id: 1, // Pending
            shipping_street: shippingStreet,
            shipping_city: shippingCity,
            shipping_province: shippingProvince,
            shipping_zip: shippingZip,
            shipping: shippingFee
        }, { transaction: t });

        const orderId = order.orderinfo_id;

        // 2. Create order lines and decrement stock
        for (const item of cart) {
            const dbItem = await Item.findByPk(item.item_id, { transaction: t });
            
            await Orderline.create({
                orderinfo_id: orderId,
                item_id: item.item_id,
                quantity: item.quantity,
                sell_price: dbItem.sell_price
            }, { transaction: t });

            // Decrement Stock directly on Item
            await dbItem.update({
                quantity: dbItem.quantity - item.quantity
            }, { transaction: t });
        }

        // 3. Create payment transaction record (maps to payments table)
        const dbPaymentMethod = mapPaymentMethod(payment_method);
        const newTransaction = await Transaction.create({
            orderinfo_id: orderId,
            payment_method: dbPaymentMethod,
            status: 'pending',
            transaction_date: new Date()
        }, { transaction: t });

        await t.commit();

        const email = customer.user ? customer.user.email : null;
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
            dateOrdered: order.date_placed,
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

        // 2. Fetch all orders for this user, including transactions and line items
        const orders = await Orderinfo.findAll({
            where: { user_id: userId },
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
            const tx = order.transaction || {};
            const lines = order.lines || [];
            const linesSum = lines.reduce((sum, line) => sum + (parseFloat(line.sell_price) * line.quantity), 0);
            const orderAmount = linesSum + parseFloat(order.shipping || 0);

            if (tx.status === 'paid' || tx.status === 'completed') {
                totalSpent += orderAmount;
            }
        });

        const loyaltyPoints = 50 + Math.round(totalSpent * 0.1);

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
            const linesSum = lines.reduce((sum, line) => sum + (parseFloat(line.sell_price) * line.quantity), 0);
            const orderAmount = linesSum + parseFloat(order.shipping || 0);
            
            return {
                order_id: order.orderinfo_id,
                date_placed: order.date_placed,
                shipping: order.shipping,
                amount: orderAmount.toFixed(2),
                payment_method: tx.payment_method || 'N/A',
                status: tx.status || 'Pending',
                items: lines.map(l => ({
                    item_id: l.item_id,
                    description: l.item ? l.item.description : 'Unknown Toy',
                    quantity: l.quantity,
                    price: l.sell_price,
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