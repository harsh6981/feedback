const User = require('../models/User');
const { validationResult } = require('express-validator');

exports.register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/register', {
                error: errors.array()[0].msg
            });
        }

        const { name, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.render('auth/register', {
                error: 'Email already registered'
            });
        }

        // Create new user
        user = new User({
            name,
            email,
            password,
            role: 'user'
        });

        await user.save();

        // Set session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.render('auth/register', {
            error: 'Registration failed. Please try again.'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('auth/login', {
                error: errors.array()[0].msg
            });
        }

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('auth/login', {
                error: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('auth/login', {
                error: 'Invalid email or password'
            });
        }

        // Set session
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Redirect based on role
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/dashboard');
        }
    } catch (error) {
        console.error(error);
        res.render('auth/login', {
            error: 'An error occurred. Please try again.'
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.redirect('/');
    });
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 