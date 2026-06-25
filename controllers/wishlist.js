const { Wishlist, Item } = require('../models');

exports.getMyWishlist = async (req, res) => {
    try {
        const wishlistItems = await Wishlist.findAll({
            where: { user_id: req.user.id },
            include: [
                {
                    model: Item,
                    as: 'item'
                }
            ]
        });

        const items = wishlistItems.map(w => ({
            item_id: w.item.item_id,
            description: w.item.description,
            sell_price: w.item.sell_price,
            img_path: w.item.img_path,
            quantity: w.item.quantity,
            wishlist_id: `${w.user_id}_${w.item_id}`
        }));

        return res.status(200).json({ success: true, items });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch wishlist.' });
    }
};

exports.toggleWishlist = async (req, res) => {
    try {
        const existing = await Wishlist.findOne({
            where: { user_id: req.user.id, item_id: req.params.id }
        });

        if (existing) {
            await existing.destroy();
            return res.status(200).json({ success: true, wishlisted: false });
        }

        await Wishlist.create({
            user_id: req.user.id,
            item_id: req.params.id
        });

        return res.status(201).json({ success: true, wishlisted: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to toggle wishlist.' });
    }
};

exports.checkWishlist = async (req, res) => {
    try {
        const existing = await Wishlist.findOne({
            where: { user_id: req.user.id, item_id: req.params.id }
        });

        return res.status(200).json({ wishlisted: !!existing });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to check wishlist status.' });
    }
};
