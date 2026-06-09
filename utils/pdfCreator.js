const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a clean PDF receipt invoice for a given order and transaction.
 * @param {Object} order - Sequelize Orderinfo model object
 * @param {Object} transaction - Sequelize Transaction model object
 * @param {Object} customer - Sequelize Customer model object (associated with User)
 * @param {Array} lines - Array of Sequelize Orderline model objects (associated with Item)
 * @param {string} filePath - Absolute path to save the PDF file
 * @returns {Promise<string>} - Resolves with the saved PDF absolute path
 */
function generateReceiptPDF(order, transaction, customer, lines, filePath) {
    return new Promise((resolve, reject) => {
        try {
            // Ensure destination directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            // 1. BRAND HEADER
            doc.fillColor('#1c1c1c')
               .font('Helvetica-Bold')
               .fontSize(22)
               .text('LITTLE MONO', { align: 'center', letterSpacing: 2 });
            
            doc.fillColor('#c5a880')
               .font('Helvetica')
               .fontSize(10)
               .text('AUTHENTIC POP MART COLLECTIBLES', { align: 'center', letterSpacing: 1 });
            
            doc.moveDown(1.5);

            // Divider Line
            doc.strokeColor('#e5dfd2')
               .lineWidth(1)
               .moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .stroke();
            
            doc.moveDown(1.5);

            // 2. INVOICE INFO & CUSTOMER INFO
            const startY = doc.y;

            // Invoice details (Left column)
            doc.fillColor('#1c1c1c')
               .font('Helvetica-Bold')
               .fontSize(12)
               .text('INVOICE DETAILS', 50, startY)
               .font('Helvetica')
               .fontSize(10)
               .text(`Invoice ID: LM-TX-${transaction.transaction_id}`)
               .text(`Order Reference: #${order.orderinfo_id}`)
               .text(`Date Placed: ${new Date(order.date_placed).toLocaleDateString()}`)
               .text(`Payment Method: ${transaction.payment_method}`)
               .text(`Status: ${transaction.status}`);

            // Customer details (Right column)
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('CUSTOMER PROFILE', 320, startY)
               .font('Helvetica')
               .fontSize(10)
               .text(`Name: ${customer.fname || ''} ${customer.lname || ''}`)
               .text(`Email: ${customer.user ? customer.user.email : 'N/A'}`)
               .text(`Phone: ${customer.phone || 'N/A'}`)
               .text(`Address: ${customer.addressline || 'N/A'}`);

            doc.moveDown(2.5);

            // Divider Line
            doc.strokeColor('#e5dfd2')
               .moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .stroke();
            
            doc.moveDown(1.5);

            // 3. PRODUCTS TABLE
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('ORDER SUMMARY', 50, doc.y);
            
            doc.moveDown(0.8);

            const tableHeaderY = doc.y;
            doc.fontSize(10);
            
            // Header columns
            doc.text('Figurine Description', 50, tableHeaderY, { width: 250 });
            doc.text('Unit Price', 300, tableHeaderY, { width: 70, align: 'right' });
            doc.text('Qty', 380, tableHeaderY, { width: 40, align: 'right' });
            doc.text('Subtotal', 450, tableHeaderY, { width: 95, align: 'right' });

            doc.moveDown(0.5);

            // Table divider
            doc.strokeColor('#c5a880')
               .lineWidth(1)
               .moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .stroke();
            
            doc.moveDown(0.5);

            let subtotalSum = 0;
            doc.font('Helvetica');

            // Draw line items
            lines.forEach(line => {
                const itemDescription = line.item ? line.item.description : 'Unboxed Collectible';
                const sellPrice = line.item ? parseFloat(line.item.sell_price) : 0;
                const lineTotal = sellPrice * line.quantity;
                subtotalSum += lineTotal;

                const currentY = doc.y;
                doc.text(itemDescription, 50, currentY, { width: 250 });
                doc.text(`$${sellPrice.toFixed(2)}`, 300, currentY, { width: 70, align: 'right' });
                doc.text(line.quantity.toString(), 380, currentY, { width: 40, align: 'right' });
                doc.text(`$${lineTotal.toFixed(2)}`, 450, currentY, { width: 95, align: 'right' });
                
                doc.moveDown(1.2);
            });

            // Table footer divider
            doc.strokeColor('#e5dfd2')
               .moveTo(50, doc.y)
               .lineTo(545, doc.y)
               .stroke();
            
            doc.moveDown(1.5);

            // 4. PRICING TOTALS
            const totalY = doc.y;
            const shippingCost = parseFloat(order.shipping || 0);
            const grandTotal = subtotalSum + shippingCost;

            doc.font('Helvetica')
               .fontSize(10)
               .text('Subtotal:', 350, totalY, { width: 100 })
               .text(`$${subtotalSum.toFixed(2)}`, 450, totalY, { width: 95, align: 'right' });

            doc.text('Shipping Fee:', 350, totalY + 15, { width: 100 })
               .text(`$${shippingCost.toFixed(2)}`, 450, totalY + 15, { width: 95, align: 'right' });

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('Grand Total:', 350, totalY + 35, { width: 100 })
               .fillColor('#c5a880')
               .text(`$${grandTotal.toFixed(2)}`, 450, totalY + 35, { width: 95, align: 'right' });

            doc.moveDown(3);

            // 5. SIGNATURE & CREDIT
            doc.fillColor('#7a7a7a')
               .font('Helvetica')
               .fontSize(8)
               .text('Thank you for shopping at Little Mono! Please keep this invoice for your unboxing verification claims.', { align: 'center' });

            doc.end();

            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateReceiptPDF };
