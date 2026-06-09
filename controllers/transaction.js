const { Transaction, Orderinfo, Orderline, Customer, User, Item, sequelize } = require('../models');
const { generateReceiptPDF } = require('../utils/pdfCreator');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs');

// 1. Get All Transactions (Admin Dashboard DataTable)
exports.getAllTransactions = async (req, res) => {
    try {
        const list = await Transaction.findAll({
            include: [
                {
                    model: Orderinfo,
                    as: 'order',
                    include: [
                        {
                            model: Customer,
                            as: 'customer',
                            include: [{ model: User, as: 'user' }]
                        }
                    ]
                }
            ],
            order: [['transaction_date', 'DESC']]
        });

        const rows = list.map(tx => {
            const order = tx.order || {};
            const customer = order.customer || {};
            const user = customer.user || {};

            return {
                transaction_id: tx.transaction_id,
                orderinfo_id: tx.orderinfo_id,
                amount: tx.amount,
                payment_method: tx.payment_method,
                status: tx.status,
                transaction_date: tx.transaction_date,
                customer_name: `${customer.fname || ''} ${customer.lname || ''}`.trim() || user.name || 'Anonymous',
                customer_email: user.email || 'N/A'
            };
        });

        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve transactions: ' + error.message });
    }
};

// 2. Get Single Transaction details
exports.getSingleTransaction = async (req, res) => {
    try {
        const tx = await Transaction.findByPk(req.params.id, {
            include: [
                {
                    model: Orderinfo,
                    as: 'order',
                    include: [
                        {
                            model: Customer,
                            as: 'customer',
                            include: [{ model: User, as: 'user' }]
                        },
                        {
                            model: Orderline,
                            as: 'lines',
                            include: [{ model: Item, as: 'item' }]
                        }
                    ]
                }
            ]
        });

        if (!tx) {
            return res.status(404).json({ success: false, error: 'Transaction not found.' });
        }

        return res.status(200).json({ success: true, transaction: tx });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch transaction details.' });
    }
};

// 3. Update Transaction Status (Generates PDF Receipt & Sends Email)
exports.updateTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }

        const transaction = await Transaction.findByPk(id, {
            include: [
                {
                    model: Orderinfo,
                    as: 'order',
                    include: [
                        {
                            model: Customer,
                            as: 'customer',
                            include: [{ model: User, as: 'user' }]
                        },
                        {
                            model: Orderline,
                            as: 'lines',
                            include: [{ model: Item, as: 'item' }]
                        }
                    ]
                }
            ]
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        // Update status
        await transaction.update({ status });

        // Retrieve relationships for receipt generation
        const order = transaction.order;
        if (order) {
            const customer = order.customer;
            const lines = order.lines || [];
            const email = customer && customer.user ? customer.user.email : null;

            if (email) {
                // Compile invoice path
                const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
                const receiptPath = path.join(receiptsDir, `invoice-${transaction.transaction_id}.pdf`);

                try {
                    // Generate PDF Receipt (Term Test 10pts requirement)
                    await generateReceiptPDF(order, transaction, customer, lines, receiptPath);

                    // Send email with attached receipt (Term Test 5pts + 10pts requirement)
                    await sendEmail({
                        email,
                        subject: `Transaction #${transaction.transaction_id} Update — Little Mono`,
                        message: `Hello ${customer.fname || 'Collector'},<br><br>Your transaction for Order #${order.orderinfo_id} has been updated to <strong>${status}</strong>.<br><br>Please find your digital receipt attached below.`,
                        attachments: [
                            {
                                filename: `Invoice-LM-${transaction.transaction_id}.pdf`,
                                path: receiptPath
                            }
                        ]
                    });
                } catch (pdfErr) {
                    console.error('PDF invoice generation/emailing failed:', pdfErr);
                }
            }
        }

        return res.status(200).json({ success: true, message: 'Transaction status updated successfully.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to update transaction status: ' + error.message });
    }
};

// 4. Delete Transaction (Admin Dashboard)
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const tx = await Transaction.findByPk(id);
        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        await tx.destroy();
        return res.status(200).json({ success: true, message: 'Transaction deleted.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to delete transaction.' });
    }
};
