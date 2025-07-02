const Feedback = require('../models/Feedback');
const { validationResult } = require('express-validator');

exports.createFeedback = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, content, category, priority } = req.body;
        const feedback = new Feedback({
            title,
            content,
            category,
            priority,
            user: req.session.userId
        });

        await feedback.save();
        res.redirect('/feedback');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'username')
            .populate('assignedTo', 'username')
            .sort({ createdAt: -1 });
        res.render('feedback/list', { feedbacks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('user', 'username')
            .populate('assignedTo', 'username')
            .populate('comments.user', 'username');

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        res.render('feedback/detail', { feedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateFeedback = async (req, res) => {
    try {
        const { status, assignedTo } = req.body;
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Only admin can update status and assignment
        if (req.session.userRole === 'admin') {
            if (status) feedback.status = status;
            if (assignedTo) feedback.assignedTo = assignedTo;
        }

        await feedback.save();
        res.redirect(`/feedback/${feedback._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        feedback.comments.push({
            content,
            user: req.session.userId
        });

        await feedback.save();
        res.redirect(`/feedback/${feedback._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Only admin or the feedback creator can delete
        if (req.session.userRole !== 'admin' && feedback.user.toString() !== req.session.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await feedback.remove();
        res.redirect('/feedback');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}; 