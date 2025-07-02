const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { isAuthenticated } = require('../middleware/auth');

// Landing page
router.get('/', (req, res) => {
    // If user is logged in, redirect to dashboard
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    // Otherwise show landing page
    res.render('index', { 
        user: null,
        title: 'Welcome to Feedback System'
    });
});

// Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ user: req.session.user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        res.render('dashboard', {
            user: req.session.user,
            feedbacks,
            title: 'Dashboard'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', {
            user: req.session.user,
            error: 'Error loading dashboard',
            title: 'Dashboard'
        });
    }
});

module.exports = router; 