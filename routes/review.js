const express = require('express');
const router = express.Router();
const { getItemReviews, canReview, createReview, getToRateItems } = require('../controllers/review');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/reviews/to-rate', isAuthenticatedUser, getToRateItems);
router.get('/reviews/:id', getItemReviews);
router.get('/reviews/:id/can-review', isAuthenticatedUser, canReview);
router.post('/reviews/:id', isAuthenticatedUser, createReview);

module.exports = router;
