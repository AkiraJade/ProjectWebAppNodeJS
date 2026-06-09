const express = require('express');

const router = express.Router();

const { createOrder, getMyOrders } = require('../controllers/order')
const { isAuthenticatedUser } = require('../middlewares/auth')

router.post('/create-order', isAuthenticatedUser, createOrder)
router.get('/my-orders', isAuthenticatedUser, getMyOrders)

module.exports = router;
