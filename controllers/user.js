const { User, Customer, Address, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Helper to dynamically get the client URL from request headers (referer or origin)
const getClientUrl = (req) => {
    if (process.env.CLIENT_URL) {
        return process.env.CLIENT_URL;
    }
    if (req.headers.referer) {
        try {
            const parsed = new URL(req.headers.referer);
            const pathParts = parsed.pathname.split('/');
            pathParts.pop(); // Remove the page name (e.g. register.html or forgot-password.html)
            return `${parsed.origin}${pathParts.join('/')}`;
        } catch (e) {
            // Ignore URL parsing errors and fallback
        }
    }
    if (req.headers.origin) {
        const origin = req.headers.origin;
        // If origin is a local address, append the project subfolder path
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return `${origin}/ProjectWebAppJs-master`;
        }
        return origin;
    }
    return 'http://localhost/ProjectWebAppJs-master';
};

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

        // Generate a 6-digit numeric verification token
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = await User.create({
            name: fullName,
            email,
            password: hashedPassword,
            role: 'customer',
            token: verificationToken,
            is_verified: false
        }, { transaction: t });

        const userId = newUser.id;

        await Customer.create({
            user_id: userId,
            fname,
            lname,
            phone,
            dob
        }, { transaction: t });

        // Save default address from registration parameters if provided
        const addressRecords = [];
        
        // If a single addressline/zipcode were passed as direct properties
        const { addressline, zipcode } = req.body;
        if (addressline) {
            addressRecords.push({
                user_id: userId,
                label: 'Home',
                street_address: addressline,
                city: 'Manila',
                province: 'Metro Manila',
                zip_code: zipcode || '1000',
                country: 'Philippines',
                is_default: true
            });
        }

        // If addresses array was provided
        if (addresses && Array.isArray(addresses) && addresses.length > 0) {
            addresses
                .filter(addr => addr.streetAddress && addr.streetAddress.trim() !== '')
                .forEach((addr, idx) => {
                    addressRecords.push({
                        user_id: userId,
                        label: addr.label || (idx === 0 ? 'Home' : `Address ${idx + 1}`),
                        street_address: addr.streetAddress,
                        city: addr.city || 'Manila',
                        province: addr.province || 'Metro Manila',
                        zip_code: addr.zipCode || '1000',
                        country: addr.country || 'Philippines',
                        is_default: idx === 0 && addressRecords.length === 0
                    });
                });
        }

        // Default address fallback to satisfy FK in orderinfo
        if (addressRecords.length === 0) {
            addressRecords.push({
                user_id: userId,
                label: 'Home',
                street_address: '123 Main St.',
                city: 'Manila',
                province: 'Metro Manila',
                zip_code: '1000',
                country: 'Philippines',
                is_default: true
            });
        }

        await Address.bulkCreate(addressRecords, { transaction: t });

        await t.commit();

        // Send verification email
        try {
            const sendEmail = require('../utils/sendEmail');
            const verifyUrl = `${getClientUrl(req)}/verify.html?email=${encodeURIComponent(email)}&token=${verificationToken}`;
            console.log('--- GENERATED VERIFY URL:', verifyUrl);
            const message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c5a880; border-radius: 12px; background-color: #faf9f6;">
                    <h2 style="color: #1c1c1c; font-family: 'Outfit', sans-serif;">Welcome to Little Mono!</h2>
                    <p style="color: #766e65; font-size: 16px;">Hi ${fname}, we're excited to have you join our collector community.</p>
                    <p style="color: #766e65; font-size: 16px;">Please verify your email address to activate your account by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyUrl}" style="background-color: #1c1c1c; color: #faf9f6; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">Verify Email</a>
                    </div>
                    <p style="color: #766e65; font-size: 14px;">Or copy and paste this link: <br> <span style="word-break: break-all; color: #a68b63;">${verifyUrl}</span></p>
                </div>
            `;
            await sendEmail({
                email,
                subject: 'Welcome to Little Mono - Verify Your Email',
                message
            });
        } catch (emailErr) {
            console.error('Failed to send verification email:', emailErr);
        }

        return res.status(200).json({
            success: true,
            userId,
            message: 'Registration successful. Please check your email to verify your account.'
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
            where: { email, deleted_at: null },
            include: [{ model: Customer, as: 'customer' }]
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ success: false, message: 'Please verify your email address before logging in.' });
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
    const t = await sequelize.transaction();
    try {
        const { fname, lname, addressline, zipcode, phone, userId } = req.body;
        const targetUserId = req.user ? req.user.id : userId;
        let image = null;

        if (req.file) {
            image = req.file.path.replace(/\\/g, "/");
        }

        const [customer, created] = await Customer.findOrCreate({
            where: { user_id: targetUserId },
            defaults: { fname, lname, phone, image_path: image },
            transaction: t
        });

        if (!created) {
            const updateFields = { fname, lname, phone };
            if (image) updateFields.image_path = image;
            await customer.update(updateFields, { transaction: t });
        }

        // Update default address in customer_addresses
        if (addressline || zipcode) {
            const [addressRecord, addrCreated] = await Address.findOrCreate({
                where: { user_id: targetUserId, is_default: true },
                defaults: {
                    user_id: targetUserId,
                    label: 'Home',
                    street_address: addressline || '123 Main St.',
                    city: 'Manila',
                    province: 'Metro Manila',
                    zip_code: zipcode || '1000',
                    country: 'Philippines',
                    is_default: true
                },
                transaction: t
            });

            if (!addrCreated) {
                await addressRecord.update({
                    street_address: addressline || addressRecord.street_address,
                    zip_code: zipcode || addressRecord.zip_code
                }, { transaction: t });
            }
        }

        // Sync name changes to user table as well
        if (fname && lname) {
            const user = await User.findByPk(targetUserId, { transaction: t });
            if (user) {
                await user.update({ name: `${fname} ${lname}` }, { transaction: t });
            }
        }

        await t.commit();
        return res.status(200).json({
            success: true,
            message: 'profile updated'
        });
    } catch (error) {
        await t.rollback();
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

        // Send deactivation confirmation email
        try {
            const sendEmail = require('../utils/sendEmail');
            const message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c5a880; border-radius: 12px; background-color: #faf9f6;">
                    <h2 style="color: #1c1c1c; font-family: 'Outfit', sans-serif;">Account Deactivated</h2>
                    <p style="color: #766e65; font-size: 16px;">Hello,</p>
                    <p style="color: #766e65; font-size: 16px;">This email is to confirm that your Little Mono account has been successfully deactivated.</p>
                    <p style="color: #766e65; font-size: 16px;">If this was a mistake or you wish to reactivate your account in the future, please contact our support team.</p>
                    <p style="color: #766e65; font-size: 16px;">We hope to see you again soon!</p>
                </div>
            `;
            await sendEmail({
                email: user.email,
                subject: 'Account Deactivation Confirmation - Little Mono',
                message
            });
        } catch (emailErr) {
            console.error('Failed to send deactivation email:', emailErr);
        }

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
            where: { deleted_at: null },
            include: [{ model: Customer, as: 'customer' }]
        });
        
        // Map to format suitable for jQuery Datatables
        const rows = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: 'Active',
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

const getDeletedUsers = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const users = await User.findAll({
            where: { deleted_at: { [Op.ne]: null } },
            include: [{ model: Customer, as: 'customer' }]
        });
        
        const rows = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.customer ? u.customer.phone : '',
            dob: u.customer ? u.customer.dob : '',
            status: 'Deactivated'
        }));

        return res.status(200).json({ rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve deleted users.' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                { model: Customer, as: 'customer' },
                { model: Address, as: 'addresses' }
            ]
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const defaultAddr = user.addresses ? (user.addresses.find(a => a.is_default) || user.addresses[0]) : null;

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                customer: user.customer ? {
                    fname: user.customer.fname,
                    lname: user.customer.lname,
                    addressline: defaultAddr ? defaultAddr.street_address : '',
                    zipcode: defaultAddr ? defaultAddr.zip_code : '',
                    phone: user.customer.phone,
                    image_path: user.customer.image_path,
                    dob: user.customer.dob
                } : null
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to retrieve profile: ' + error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Please enter your email address.' });
        }

        const user = await User.findOne({ where: { email, deleted_at: null } });
        if (!user) {
            return res.status(404).json({ error: 'No account associated with this email.' });
        }

        // Generate a 6-digit numeric reset token
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save to token column
        await user.update({ token: resetToken });

        // Import sendEmail
        const sendEmail = require('../utils/sendEmail');
        const resetUrl = `${getClientUrl(req)}/reset-password.html?email=${encodeURIComponent(email)}&token=${resetToken}`;
        
        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c5a880; border-radius: 12px; background-color: #faf9f6;">
                <h2 style="color: #1c1c1c; font-family: 'Outfit', sans-serif;">Password Reset Request</h2>
                <p style="color: #766e65; font-size: 16px;">You are receiving this email because you (or someone else) requested a password reset for your Little Mono account.</p>
                <p style="color: #766e65; font-size: 16px;">Please click the button below to complete the process:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #1c1c1c; color: #faf9f6; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #766e65; font-size: 14px;">Alternatively, you can copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; color: #a68b63; font-size: 14px;">${resetUrl}</p>
                <hr style="border: none; border-top: 1px solid rgba(197,168,128,0.15); margin: 20px 0;">
                <p style="color: #766e65; font-size: 12px;">If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Little Mono - Password Reset Request',
            message
        });

        return res.status(200).json({
            success: true,
            message: 'A password reset link has been sent to your email address.'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to send password reset email: ' + error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, token, password } = req.body;

        if (!email || !token || !password) {
            return res.status(400).json({ error: 'Please provide email, token, and new password.' });
        }

        const user = await User.findOne({ where: { email, token, deleted_at: null } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired password reset link.' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear token
        await user.update({
            password: hashedPassword,
            token: null
        });

        return res.status(200).json({
            success: true,
            message: 'Your password has been successfully reset. You can now log in.'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ error: 'Email and token are required for verification.' });
        }

        const user = await User.findOne({ where: { email, token, deleted_at: null } });
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token.' });
        }

        await user.update({
            is_verified: true,
            token: null
        });

        return res.status(200).json({
            success: true,
            message: 'Your email has been successfully verified! You can now log in.'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to verify email: ' + error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please enter both current and new passwords.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await user.update({
            password: hashedPassword
        });

        // Send security alert email
        try {
            const sendEmail = require('../utils/sendEmail');
            const message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c5a880; border-radius: 12px; background-color: #faf9f6;">
                    <h2 style="color: #1c1c1c; font-family: 'Outfit', sans-serif;">Security Alert: Password Changed</h2>
                    <p style="color: #766e65; font-size: 16px;">Hello,</p>
                    <p style="color: #766e65; font-size: 16px;">The password for your Little Mono account was recently changed.</p>
                    <p style="color: #766e65; font-size: 16px;">If you made this change, you can safely ignore this email.</p>
                    <p style="color: #d9534f; font-size: 16px; font-weight: bold;">If you did NOT request this change, please contact our support team immediately to secure your account.</p>
                </div>
            `;
            await sendEmail({
                email: user.email,
                subject: 'Security Alert - Password Changed',
                message
            });
        } catch (emailErr) {
            console.error('Failed to send password change email:', emailErr);
        }

        return res.status(200).json({
            success: true,
            message: 'Your password has been changed successfully.'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to change password: ' + error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    updateUser,
    deactivateUser,
    getAllUsers,
    updateUserRole,
    toggleUserDeactivation,
    getDeletedUsers,
    getMe,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail
};