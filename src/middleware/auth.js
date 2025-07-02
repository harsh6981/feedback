const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/users/login');
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).render('error', {
        message: 'Access denied. Admin privileges required.',
        error: {}
    });
};

// Middleware to attach user to request
exports.attachUser = async (req, res, next) => {
    try {
        if (req.session.userId) {
            const user = await User.findById(req.session.userId).select('-password');
            req.user = user;
        }
        next();
    } catch (error) {
        console.error(error);
        next(error);
    }
};

module.exports = {
    isAuthenticated,
    isAdmin
}; 