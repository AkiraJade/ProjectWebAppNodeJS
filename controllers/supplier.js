const { Supplier, Item, Brand } = require('../models');

// Fetch all suppliers
exports.getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll();
        return res.status(200).json({ success: true, rows: suppliers });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch suppliers.' });
    }
};

// Fetch single supplier details with their supplied items
exports.getSingleSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id, {
            include: [{ 
                model: Item, 
                as: 'items', 
                where: { deleted_at: null }, 
                required: false,
                include: [{ model: Brand, as: 'brand' }]
            }]
        });
        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }
        return res.status(200).json({ success: true, result: supplier });
    } catch (error) {
        console.error('Error fetching single supplier:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch supplier details.' });
    }
};

// Create a new supplier
exports.createSupplier = async (req, res) => {
    try {
        const { name, contact_person, email, phone, address } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Supplier name is required.' });
        }

        const existing = await Supplier.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, error: 'A supplier with this name already exists.' });
        }

        const supplier = await Supplier.create({
            name,
            contact_person,
            email,
            phone,
            address
        });

        return res.status(201).json({ success: true, supplier });
    } catch (error) {
        console.error('Error creating supplier:', error);
        return res.status(500).json({ success: false, error: 'Failed to create supplier.' });
    }
};

// Update an existing supplier
exports.updateSupplier = async (req, res) => {
    try {
        const { name, contact_person, email, phone, address } = req.body;
        const supplier = await Supplier.findByPk(req.params.id);

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Supplier not found.' });
        }

        if (name && name !== supplier.name) {
            const existing = await Supplier.findOne({ where: { name } });
            if (existing) {
                return res.status(400).json({ success: false, error: 'A supplier with this name already exists.' });
            }
        }

        await supplier.update({
            name: name || supplier.name,
            contact_person,
            email,
            phone,
            address
        });

        return res.status(200).json({ success: true, supplier });
    } catch (error) {
        console.error('Error updating supplier:', error);
        return res.status(500).json({ success: false, error: 'Failed to update supplier.' });
    }
};

// Delete a supplier
exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Supplier not found.' });
        }

        await supplier.destroy();
        return res.status(200).json({ success: true, message: 'Supplier deleted successfully.' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete supplier.' });
    }
};
