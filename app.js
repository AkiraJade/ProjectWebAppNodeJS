const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path')

const items = require('./routes/item');
const users = require('./routes/user');
const orders = require('./routes/order');
const dashboard = require('./routes/dashboard');
const transactions = require('./routes/transaction');
const reviews = require('./routes/review');
const wishlists = require('./routes/wishlist');
const addresses = require('./routes/address');

// app.get('/', (req, res) => {
//     res.send('Hello from nodejs!')
// })
app.use(cors())
app.use(express.json())
app.use('/images', express.static(path.join(__dirname, 'images')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))) // expose uploads folder for receipts/avatars

// Request logger middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});


app.use('/api/v1', items);
app.use('/api/v1', users);
app.use('/api/v1', orders);
app.use('/api/v1', dashboard);
app.use('/api/v1', transactions);
app.use('/api/v1', reviews);
app.use('/api/v1', wishlists);
app.use('/api/v1', addresses);

module.exports = app