const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Feedback = require('../models/Feedback');

// Middleware to check if user is admin
const isAdminMiddleware = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/users/login');
    }
};

// Admin dashboard
router.get('/dashboard', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        const users = await User.find({ role: { $ne: 'admin' } })
            .select('name email createdAt')
            .sort({ createdAt: -1 });

        const stats = {
            totalFeedbacks: await Feedback.countDocuments(),
            pendingFeedbacks: await Feedback.countDocuments({ status: 'pending' }),
            resolvedFeedbacks: await Feedback.countDocuments({ status: 'resolved' }),
            totalUsers: await User.countDocuments({ role: { $ne: 'admin' } })
        };

        res.render('admin/dashboard', {
            user: req.session.user,
            feedbacks,
            users,
            stats,
            title: 'Admin Dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', {
            message: 'Error loading admin dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Update feedback status
router.patch('/feedback/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        feedback.status = req.body.status;
        await feedback.save();

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating feedback status:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
});

// Delete feedback
router.delete('/feedback/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndDelete(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ message: 'Error deleting feedback' });
    }
});

// User management
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.render('admin/users', {
            users,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            message: 'Error loading users',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Feedback management
router.get('/feedbacks', isAdmin, async (req, res) => {
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
            .populate('user', 'username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Feedback.countDocuments(query);

        res.render('admin/feedbacks', {
            feedbacks,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            status,
            category,
            search,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            message: 'Error loading feedbacks',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Analytics
router.get('/analytics', isAdmin, async (req, res) => {
    try {
        // Get feedback trends over time
        const feedbackTrends = await Feedback.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
        ]);

        // Get category distribution
        const categoryDistribution = await Feedback.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        // Get status distribution
        const statusDistribution = await Feedback.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Get user activity
        const userActivity = await Feedback.aggregate([
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    username: '$user.username',
                    count: 1
                }
            }
        ]);

        res.render('admin/analytics', {
            feedbackTrends,
            categoryDistribution,
            statusDistribution,
            userActivity,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            message: 'Error loading analytics',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router; 