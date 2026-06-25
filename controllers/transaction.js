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
                            model: User,
                            as: 'user',
                            include: [{ model: Customer, as: 'customer' }]
                        },
                        {
                            model: Orderline,
                            as: 'lines'
                        }
                    ]
                }
            ],
            order: [['transaction_date', 'DESC']]
        });

        const rows = list.map(tx => {
            const order = tx.order || {};
            const user = order.user || {};
            const customer = user.customer || {};
            const lines = order.lines || [];
            
            const linesSum = lines.reduce((sum, line) => sum + (parseFloat(line.sell_price) * line.quantity), 0);
            const amount = linesSum + parseFloat(order.shipping || 0);

            return {
                transaction_id: tx.transaction_id,
                orderinfo_id: tx.orderinfo_id,
                amount: amount.toFixed(2),
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
                            model: User,
                            as: 'user',
                            include: [{ model: Customer, as: 'customer' }]
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

        // Calculate dynamic amount for response compatibility
        const order = tx.order || {};
        const lines = order.lines || [];
        const linesSum = lines.reduce((sum, line) => sum + (parseFloat(line.sell_price) * line.quantity), 0);
        const amount = linesSum + parseFloat(order.shipping || 0);
        
        // Expose virtual amount
        const txData = tx.toJSON();
        txData.amount = amount.toFixed(2);

        // Keep compatibility with frontend that expects transaction.order.customer
        if (txData.order && txData.order.user && txData.order.user.customer) {
            txData.order.customer = txData.order.user.customer;
            txData.order.customer.user = { email: txData.order.user.email, name: txData.order.user.name };
        }

        return res.status(200).json({ success: true, transaction: txData });
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
                            model: User,
                            as: 'user',
                            include: [{ model: Customer, as: 'customer' }]
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
            const user = order.user || {};
            const customer = user.customer;
            const lines = order.lines || [];
            const email = user.email;

            if (email) {
                // Compile invoice path
                const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
                const receiptPath = path.join(receiptsDir, `invoice-${transaction.transaction_id}.pdf`);

                try {
                    // Adapt customer object properties to keep PDF creator working
                    const pdfCustomer = customer ? customer.toJSON() : {};
                    pdfCustomer.user = { email: user.email };
                    
                    // Generate PDF Receipt (Term Test 10pts requirement)
                    await generateReceiptPDF(order, transaction, pdfCustomer, lines, receiptPath);

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

exports.exportTransactionsCSV = async (req, res) => {
    try {
        const list = await Transaction.findAll({
            include: [
                {
                    model: Orderinfo,
                    as: 'order',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            include: [{ model: Customer, as: 'customer' }]
                        },
                        {
                            model: Orderline,
                            as: 'lines'
                        }
                    ]
                }
            ],
            order: [['transaction_date', 'DESC']]
        });

        // Generate CSV header
        let csvContent = "Transaction ID,Order ID,Customer Name,Customer Email,Amount,Payment Method,Status,Transaction Date\n";
        
        list.forEach(tx => {
            const order = tx.order || {};
            const user = order.user || {};
            const customer = user.customer || {};
            const lines = order.lines || [];
            
            const linesSum = lines.reduce((sum, line) => sum + (parseFloat(line.sell_price) * line.quantity), 0);
            const amount = linesSum + parseFloat(order.shipping || 0);

            const customerName = `${customer.fname || ''} ${customer.lname || ''}`.trim() || user.name || 'Anonymous';
            const customerEmail = user.email || 'N/A';
            const date = new Date(tx.transaction_date).toISOString().replace(/T/, ' ').replace(/\..+/, '');
            
            // Escape values containing commas or quotes
            const cleanName = `"${customerName.replace(/"/g, '""')}"`;
            const cleanEmail = `"${customerEmail.replace(/"/g, '""')}"`;
            const cleanMethod = `"${tx.payment_method.replace(/"/g, '""')}"`;
            const cleanStatus = `"${tx.status.replace(/"/g, '""')}"`;
            
            csvContent += `${tx.transaction_id},${tx.orderinfo_id},${cleanName},${cleanEmail},${amount.toFixed(2)},${cleanMethod},${cleanStatus},${date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions_summary.csv"');
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to export CSV: ' + error.message });
    }
};
