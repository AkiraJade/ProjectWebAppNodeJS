const express = require('express');
const router = express.Router();
const { getMyWishlist, toggleWishlist, checkWishlist } = require('../controllers/wishlist');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/wishlist', isAuthenticatedUser, getMyWishlist);
router.get('/wishlist/:id/check', isAuthenticatedUser, checkWishlist);
router.post('/wishlist/:id/toggle', isAuthenticatedUser, toggleWishlist);

module.exports = router;
