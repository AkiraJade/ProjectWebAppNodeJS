const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Middleware to verify active session JWT token (MP5 requirement)
exports.isAuthenticatedUser = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'Login first to access this resource' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Login first to access this resource' });
        }

        // Verify signature
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtErr) {
            return res.status(401).json({ message: 'Invalid or expired session token. Please sign in again.' });
        }

        // Fetch user from DB and check stored token matching (MP5 requirement)
        const user = await User.findByPk(decoded.id);
        if (!user || user.deleted_at) {
            return res.status(401).json({ message: 'Unauthorized. User account deactivated or not found.' });
        }

        // Verify token matches active DB token
        if (user.token !== token) {
            return res.status(401).json({ message: 'Session expired or logged in from another device. Please sign in again.' });
        }

        // Bind user to request object
        req.user = user;
        
        // Also bind to req.body.user to maintain legacy compatibilities
        req.body = req.body || {};
        req.body.user = { id: user.id };

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Authentication processing failed.' });
    }
};

// Middleware to authorize specific roles (Quiz 3 route protection requirement)
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Role (${req.user ? req.user.role : 'Guest'}) is not authorized to access this resource.`
            });
        }
        next();
    };
};
