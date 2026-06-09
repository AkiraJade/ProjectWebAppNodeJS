const { User, Customer, Address, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. User Registration (transactional creation)
const registerUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { fname, lname, email, password, phone, dob, addresses } = req.body;

        if (!fname || !lname || !email || !password) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required profile fields' });
        }

        // Check if email already registered
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ error: 'Email address is already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = `${fname} ${lname}`;

        const newUser = await User.create({
            name: fullName,
            email,
            password: hashedPassword,
            role: 'customer' // default role
        }, { transaction: t });

        const userId = newUser.id;

        await Customer.create({
            user_id: userId,
            fname,
            lname,
            phone,
            dob
        }, { transaction: t });

        // Save optional shipping addresses if provided
        if (addresses && Array.isArray(addresses) && addresses.length > 0) {
            const addressRecords = addresses
                .filter(addr => addr.streetAddress && addr.streetAddress.trim() !== '')
                .map(addr => ({
                    user_id: userId,
                    street_address: addr.streetAddress,
                    city: addr.city,
                    province: addr.province,
                    zip_code: addr.zipCode,
                    country: addr.country
                }));

            if (addressRecords.length > 0) {
                await Address.bulkCreate(addressRecords, { transaction: t });
            }
        }

        await t.commit();
        return res.status(200).json({
            success: true,
            userId
        });
    } catch (error) {
        await t.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
};

// 2. User Login (verifies password and saves token to DB)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter email and password' });
        }

        const user = await User.findOne({
            where: { email, deleted_at: null }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Generate token and save it to the users database row (MP5 requirement)
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        await user.update({ token });

        // Format user details response matching previous structure
        const userObj = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        return res.status(200).json({
            success: "welcome back",
            user: userObj,
            token
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Login failed: ' + error.message });
    }
};

// 3. User Self Profile Update
const updateUser = async (req, res) => {
    try {
        const { fname, lname, addressline, zipcode, phone, userId } = req.body;
        let image = null;

        if (req.file) {
            image = req.file.path.replace(/\\/g, "/");
        }

        const [customer, created] = await Customer.findOrCreate({
            where: { user_id: userId },
            defaults: { fname, lname, addressline, zipcode, phone, image_path: image }
        });

        if (!created) {
            const updateFields = { fname, lname, addressline, zipcode, phone };
            if (image) updateFields.image_path = image;
            await customer.update(updateFields);
        }

        // Sync name changes to user table as well
        if (fname && lname) {
            const user = await User.findByPk(userId);
            if (user) {
                await user.update({ name: `${fname} ${lname}` });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'profile updated'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to update profile: ' + error.message });
    }
};

// 4. User Self Deactivation
const deactivateUser = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({
            deleted_at: new Date(),
            token: null // Clear active session token upon deactivation
        });

        return res.status(200).json({
            success: true,
            message: 'User deactivated successfully',
            email,
            deleted_at: user.deleted_at
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to deactivate account.' });
    }
};

// 5. Admin API: Get All Users (MP6)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{ model: Customer, as: 'customer' }]
        });
        
        // Map to format suitable for jQuery Datatables
        const rows = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.deleted_at ? 'Deactivated' : 'Active',
            phone: u.customer ? u.customer.phone : '',
            dob: u.customer ? u.customer.dob : '',
            image_path: u.customer ? u.customer.image_path : null
        }));

        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve users.' });
    }
};

// 6. Admin API: Update Role of User (MP6)
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ error: 'Role parameter is required.' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await user.update({ role });
        return res.status(200).json({ success: true, message: 'User role updated successfully.', user: { id: user.id, role: user.role } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to update user role.' });
    }
};

// 7. Admin API: Toggle User Deactivation Status (MP6)
const toggleUserDeactivation = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (user.deleted_at) {
            // Re-activate
            await user.update({ deleted_at: null });
            return res.status(200).json({ success: true, status: 'Active', message: 'User activated successfully.' });
        } else {
            // Deactivate
            await user.update({ deleted_at: new Date(), token: null });
            return res.status(200).json({ success: true, status: 'Deactivated', message: 'User deactivated successfully.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to change user deactivation state.' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    updateUser,
    deactivateUser,
    getAllUsers,
    updateUserRole,
    toggleUserDeactivation
};