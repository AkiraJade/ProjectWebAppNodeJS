const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path')

const items = require('./routes/item');
const users = require('./routes/user');
const orders = require('./routes/order');
const dashboard = require('./routes/dashboard');
const transactions = require('./routes/transaction');

// app.get('/', (req, res) => {
//     res.send('Hello from nodejs!')
// })
app.use(cors())
app.use(express.json())
app.use('/images', express.static(path.join(__dirname, 'images')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))) // expose uploads folder for receipts/avatars


app.use('/api/v1', items);
app.use('/api/v1', users);
app.use('/api/v1', orders);
app.use('/api/v1', dashboard);
app.use('/api/v1', transactions);

module.exports = app