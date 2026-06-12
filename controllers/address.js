const { Address } = require('../models');

// 1. Get all saved addresses for logged-in user
exports.getMyAddresses = async (req, res) => {
    try {
        const list = await Address.findAll({
            where: { user_id: req.user.id }
        });
        return res.status(200).json({ success: true, addresses: list });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve addresses.' });
    }
};

// 2. Add a new address
exports.addAddress = async (req, res) => {
    try {
        const { street_address, city, province, zip_code, country } = req.body;
        
        if (!street_address || !city || !province || !zip_code || !country) {
            return res.status(400).json({ error: 'Missing required address fields.' });
        }

        const newAddress = await Address.create({
            user_id: req.user.id,
            street_address,
            city,
            province,
            zip_code,
            country
        });

        return res.status(201).json({ success: true, address: newAddress });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to add address.' });
    }
};

// 3. Delete a saved address
exports.deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const address = await Address.findOne({
            where: { address_id: addressId, user_id: req.user.id }
        });

        if (!address) {
            return res.status(404).json({ error: 'Address not found or unauthorized.' });
        }

        await address.destroy();
        return res.status(200).json({ success: true, message: 'Address deleted.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to delete address.' });
    }
};
