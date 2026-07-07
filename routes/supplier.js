const express = require('express');
const router = express.Router();
const {
    getAllSuppliers,
    getSingleSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require('../controllers/supplier');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/suppliers', getAllSuppliers);
router.get('/suppliers/:id', getSingleSupplier);
router.post('/suppliers', isAuthenticatedUser, createSupplier);
router.put('/suppliers/:id', isAuthenticatedUser, updateSupplier);
router.delete('/suppliers/:id', isAuthenticatedUser, deleteSupplier);

module.exports = router;
