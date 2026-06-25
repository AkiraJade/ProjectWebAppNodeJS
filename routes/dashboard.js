const express = require('express');

const router = express.Router();


const { addressChart, salesChart, itemsChart, getDashboardSummary } = require('../controllers/dashboard')
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth')
router.get('/address-chart', isAuthenticatedUser, authorizeRoles('admin'), addressChart)
router.get('/sales-chart', isAuthenticatedUser, authorizeRoles('admin'), salesChart)
router.get('/items-chart', isAuthenticatedUser, authorizeRoles('admin'), itemsChart)
router.get('/dashboard/summary', isAuthenticatedUser, authorizeRoles('admin'), getDashboardSummary)

module.exports = router;




