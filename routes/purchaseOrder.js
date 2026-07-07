const express = require('express');
const router = express.Router();
const { createPurchaseOrder, getPurchaseOrders } = require('../controllers/purchaseOrder');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/purchase-orders', isAuthenticatedUser, createPurchaseOrder);
router.get('/purchase-orders', isAuthenticatedUser, getPurchaseOrders);

module.exports = router;
