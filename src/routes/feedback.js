const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// List all feedback
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const category = req.query.category;
        const search = req.query.search;

        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const feedbacks = await Feedback.find(query)
            .populate('user', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Feedback.countDocuments(query);

        res.render('feedback/index', {
            feedbacks,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            status,
            category,
            search,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading feedbacks:', error);
        res.status(500).render('error', {
            message: 'Error loading feedbacks',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Show feedback form
router.get('/new', isAuthenticated, (req, res) => {
    res.render('feedback/new', {
        user: req.session.user
    });
});

// Create feedback
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const feedback = new Feedback({
            ...req.body,
            user: req.session.user._id
        });
        await feedback.save();
        res.redirect('/feedback/my-feedback');
    } catch (error) {
        console.error('Error creating feedback:', error);
        res.status(500).render('error', {
            message: 'Error creating feedback',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Show feedback details
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('user', 'name email');
        
        if (!feedback) {
            return res.status(404).render('error', {
                message: 'Feedback not found',
                error: {}
            });
        }

        res.render('feedback/details', {
            feedback,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading feedback details:', error);
        res.render('error', {
            message: 'Error loading feedback details',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Update feedback status (admin only)
router.patch('/:id/status', isAdmin, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        feedback.status = req.body.status;
        await feedback.save();

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating status' });
    }
});

// Add comment
router.post('/:id/comments', isAuthenticated, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        feedback.comments.push({
            content: req.body.content,
            user: req.user._id
        });

        await feedback.save();
        res.redirect(`/feedback/${feedback._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            message: 'Error adding comment',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Submit feedback
router.post('/submit', isAuthenticated, async (req, res) => {
    try {
        const { title, category, description } = req.body;
        
        if (!req.session.user || !req.session.user._id) {
            console.error('No user session found');
            return res.redirect('/users/login');
        }

        const feedback = new Feedback({
            title,
            category,
            description,
            user: req.session.user._id,
            status: 'pending'
        });

        await feedback.save();
        console.log('Feedback submitted successfully:', feedback);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.render('dashboard', {
            error: 'Failed to submit feedback. Please try again.',
            user: req.session.user
        });
    }
});

// View user's feedback
router.get('/my-feedback', isAuthenticated, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ user: req.session.user._id })
            .sort({ createdAt: -1 });

        res.render('feedback/my-feedback', {
            feedbacks,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading feedback:', error);
        res.render('error', {
            message: 'Error loading feedback',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router; 