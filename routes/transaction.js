const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const {
    getAllTransactions,
    getSingleTransaction,
    updateTransactionStatus,
    deleteTransaction
} = require('../controllers/transaction');

// Protected transaction management (Admin-only)
router.get('/transactions', isAuthenticatedUser, authorizeRoles('admin'), getAllTransactions);
router.get('/transactions/:id', isAuthenticatedUser, authorizeRoles('admin'), getSingleTransaction);
router.put('/transactions/:id', isAuthenticatedUser, authorizeRoles('admin'), updateTransactionStatus);
router.delete('/transactions/:id', isAuthenticatedUser, authorizeRoles('admin'), deleteTransaction);

module.exports = router;
