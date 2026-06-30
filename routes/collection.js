const express = require('express');
const router = express.Router();
const {
    getCollectionLog,
    addCollectionLog,
    updateCollectionLog,
    deleteCollectionLog,
    getSeriesProgress
} = require('../controllers/collection');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.route('/collection')
    .get(isAuthenticatedUser, getCollectionLog)
    .post(isAuthenticatedUser, addCollectionLog);

router.route('/collection/progress')
    .get(isAuthenticatedUser, getSeriesProgress);

router.route('/collection/:id')
    .put(isAuthenticatedUser, updateCollectionLog)
    .delete(isAuthenticatedUser, deleteCollectionLog);

module.exports = router;
