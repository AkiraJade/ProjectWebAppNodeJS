const express = require('express');
const router = express.Router();
const { getAllItems,
    getSingleItem,
    createItem,
    updateItem,
    deleteItem,
    searchItems,
} = require('../controllers/item')
const upload = require('../utils/multer')
const { isAuthenticatedUser } = require('../middlewares/auth')

router.get('/items', getAllItems)
router.get('/search', searchItems)
router.get('/items/:id', getSingleItem)
router.post('/items', isAuthenticatedUser, upload.array('images', 5), createItem)
router.put('/items/:id', isAuthenticatedUser, upload.array('images', 5), updateItem)
router.delete('/items/:id', isAuthenticatedUser, deleteItem)
module.exports = router;