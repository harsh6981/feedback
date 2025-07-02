const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/auth');

// Regular user registration
router.get('/register', (req, res) => {
    res.render('users/register', { error: null });
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.render('users/register', {
                error: 'All fields are required'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.render('users/register', {
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
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('users/register', {
                    error: 'Registration successful but login failed. Please try logging in.'
                });
            }
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.render('users/register', {
            error: 'Registration failed. Please try again.'
        });
    }
});

// Login page
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('users/login', { error: null });
});

// Login process
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('users/login', {
                error: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('users/login', {
                error: 'Invalid email or password'
            });
        }

        // Set user session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('users/login', {
                    error: 'An error occurred during login'
                });
            }
            res.redirect('/dashboard');
        });
    } catch (error) {
        console.error('Login error:', error);
        res.render('users/login', {
            error: 'An error occurred during login'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    // Store the current path to redirect back to
    const currentPath = req.headers.referer || '/';
    
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).render('error', {
                message: 'Error during logout',
                error: process.env.NODE_ENV === 'development' ? err : {}
            });
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        
        // Redirect to home page
        res.redirect('/');
    });
});

// Profile page
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        res.render('users/profile', { user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).render('error', {
            message: 'Error loading profile',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Show admin registration form
router.get('/admin/register', (req, res) => {
    res.render('users/admin-register', {
        user: null,
        error: null,
        title: 'Admin Registration'
    });
});

// Handle admin registration
router.post('/admin/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword, adminCode } = req.body;

        // Validate required fields
        if (!name || !email || !password || !confirmPassword || !adminCode) {
            return res.render('users/admin-register', {
                user: null,
                error: 'All fields are required',
                title: 'Admin Registration'
            });
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.render('users/admin-register', {
                user: null,
                error: 'Passwords do not match',
                title: 'Admin Registration'
            });
        }

        // Validate admin code (you should store this securely in environment variables)
        if (adminCode !== process.env.ADMIN_REGISTRATION_CODE) {
            return res.render('users/admin-register', {
                user: null,
                error: 'Invalid admin registration code',
                title: 'Admin Registration'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.render('users/admin-register', {
                user: null,
                error: 'Email already registered',
                title: 'Admin Registration'
            });
        }

        // Create new admin user
        user = new User({
            name,
            email,
            password,
            role: 'admin'
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Set session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Admin registration error:', error);
        res.render('users/admin-register', {
            user: null,
            error: 'An error occurred during registration',
            title: 'Admin Registration'
        });
    }
});

// Show admin login form
router.get('/admin-login', (req, res) => {
    res.render('users/admin-login', {
        user: null,
        error: null,
        title: 'Admin Login'
    });
});

// Handle admin login
router.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        
        // Check if user exists and is an admin
        if (!user || user.role !== 'admin') {
            console.log('Admin login failed:', { email, userExists: !!user, role: user?.role });
            return res.render('users/admin-login', {
                user: null,
                error: 'Invalid admin credentials',
                title: 'Admin Login'
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Password mismatch for admin:', email);
            return res.render('users/admin-login', {
                user: null,
                error: 'Invalid admin credentials',
                title: 'Admin Login'
            });
        }

        // Set session
        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('users/admin-login', {
                    user: null,
                    error: 'An error occurred during login',
                    title: 'Admin Login'
                });
            }
            console.log('Admin login successful:', user.email);
            res.redirect('/admin/dashboard');
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.render('users/admin-login', {
            user: null,
            error: 'An error occurred during login',
            title: 'Admin Login'
        });
    }
});

module.exports = router; 