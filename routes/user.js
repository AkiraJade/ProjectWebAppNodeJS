const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const {
    registerUser,
    loginUser,
    updateUser,
    deactivateUser,
    getAllUsers,
    updateUserRole,
    toggleUserDeactivation
} = require('../controllers/user');

// Public authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// User profile updates
router.post('/update-profile', upload.single('image'), updateUser);
router.delete('/deactivate', deactivateUser);

// Admin-only user management routes (MP6)
router.get('/users', isAuthenticatedUser, authorizeRoles('admin'), getAllUsers);
router.put('/users/:id/role', isAuthenticatedUser, authorizeRoles('admin'), updateUserRole);
router.put('/users/:id/deactivate', isAuthenticatedUser, authorizeRoles('admin'), toggleUserDeactivation);

module.exports = router;