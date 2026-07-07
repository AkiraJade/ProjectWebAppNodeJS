const { Orderinfo, Orderline, Customer, User, Item, Address, Transaction, sequelize } = require('../models');
const sendEmail = require('../utils/sendEmail');
const { generateReceiptPDF } = require('../utils/pdfCreator');
const path = require('path');
const fs = require('fs');

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
        // 4. Send order confirmation email with PDF receipt attached
        if (email) {
            try {
                // Re-fetch order lines with item details for the PDF
                const orderLines = await Orderline.findAll({
                    where: { orderinfo_id: orderId },
                    include: [{ model: Item, as: 'item' }]
                });

                // Build receipts directory and file path
                const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
                const receiptPath = path.join(receiptsDir, `invoice-${newTransaction.transaction_id}.pdf`);

                // Adapt customer object for PDF creator
                const pdfCustomer = customer.toJSON ? customer.toJSON() : { ...customer };
                pdfCustomer.user = { email };

                // Generate PDF receipt
                await generateReceiptPDF(order, newTransaction, pdfCustomer, orderLines, receiptPath);

                // Build a rich HTML email body
                const hostUrl = `${req.protocol}://${req.get('host')}`;
                const linesTotal = orderLines.reduce((sum, l) => sum + parseFloat(l.sell_price) * l.quantity, 0);
                const grandTotal = linesTotal + parseFloat(order.shipping || 0);
                const lineItemsHtml = orderLines.map(l => `
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe2; color: #1c1c1c; font-size: 14px;">${l.item ? l.item.description : 'Collectible'}</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe2; color: #766e65; font-size: 14px; text-align: center;">x${l.quantity}</td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe2; color: #1c1c1c; font-size: 14px; text-align: right;">&#36;${(parseFloat(l.sell_price) * l.quantity).toFixed(2)}</td>
                    </tr>`).join('');

                const htmlMessage = `
                    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 30px 20px; border: 1px solid #c5a880; border-radius: 12px; background-color: #faf9f6;">
                        <h2 style="color: #1c1c1c; font-size: 22px; letter-spacing: 2px; text-align: center; margin-bottom: 4px;">LITTLE MONO</h2>
                        <p style="color: #c5a880; font-size: 11px; text-align: center; letter-spacing: 1px; margin-top: 0;">AUTHENTIC POP MART COLLECTIBLES</p>
                        <hr style="border: none; border-top: 1px solid #e5dfd2; margin: 20px 0;">
                        <h3 style="color: #1c1c1c;">Order Confirmed! &#127881;</h3>
                        <p style="color: #766e65; font-size: 15px;">Hi <strong>${customer.fname || 'Collector'}</strong>, your order has been successfully placed. We&rsquo;re excited to get your collectibles on their way!</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; font-size: 12px; color: #c5a880; padding-bottom: 8px; border-bottom: 1px solid #c5a880;">ITEM</th>
                                    <th style="text-align: center; font-size: 12px; color: #c5a880; padding-bottom: 8px; border-bottom: 1px solid #c5a880;">QTY</th>
                                    <th style="text-align: right; font-size: 12px; color: #c5a880; padding-bottom: 8px; border-bottom: 1px solid #c5a880;">SUBTOTAL</th>
                                </tr>
                            </thead>
                            <tbody>${lineItemsHtml}</tbody>
                        </table>
                        <table style="width: 100%; margin-top: 10px;">
                            <tr><td style="color: #766e65; font-size: 13px;">Shipping Fee</td><td style="text-align: right; color: #766e65; font-size: 13px;">&#36;${parseFloat(order.shipping || 0).toFixed(2)}</td></tr>
                            <tr><td style="color: #1c1c1c; font-size: 15px; font-weight: bold; padding-top: 8px;">Grand Total</td><td style="text-align: right; color: #c5a880; font-size: 15px; font-weight: bold; padding-top: 8px;">&#36;${grandTotal.toFixed(2)}</td></tr>
                        </table>
                        <hr style="border: none; border-top: 1px solid #e5dfd2; margin: 24px 0;">
                        <p style="color: #766e65; font-size: 13px;"><strong>Order #:</strong> ${orderId} &nbsp;|&nbsp; <strong>Transaction #:</strong> ${newTransaction.transaction_id} &nbsp;|&nbsp; <strong>Payment:</strong> ${newTransaction.payment_method}</p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${hostUrl}/uploads/receipts/invoice-${newTransaction.transaction_id}.pdf" style="background-color: #1c1c1c; color: #faf9f6; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block; letter-spacing: 0.5px;">&#128196; Download Receipt (PDF)</a>
                        </div>
                        <p style="color: #766e65; font-size: 13px; text-align: center;">Thank you for shopping with Little Mono! &#x1F381;</p>
                    </div>`;

                await sendEmail({
                    email,
                    subject: `Order #${orderId} Confirmed — Little Mono`,
                    message: htmlMessage,
                    attachments: [{
                        filename: `Receipt-LM-${newTransaction.transaction_id}.pdf`,
                        path: receiptPath,
                        contentType: 'application/pdf'
                    }]
                });
            } catch (emailErr) {
                console.error('Order confirmation email/PDF failed:', emailErr);
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