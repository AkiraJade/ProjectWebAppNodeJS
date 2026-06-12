const express = require('express');
const router = express.Router();
const { getMyAddresses, addAddress, deleteAddress } = require('../controllers/address');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/addresses', isAuthenticatedUser, getMyAddresses);
router.post('/addresses', isAuthenticatedUser, addAddress);
router.delete('/addresses/:id', isAuthenticatedUser, deleteAddress);

module.exports = router;
