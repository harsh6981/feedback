

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { isAuthenticated, isGuest } = require('../middleware/auth');

// Login page
router.get('/login', isGuest, (req, res) => {
    res.render('auth/login');
});

// Register page
router.get('/register', isGuest, (req, res) => {
    res.render('auth/register');
});

// Login process
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], authController.login);

// Register process
router.post('/register', [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], authController.register);

// Logout
router.get('/logout', isAuthenticated, authController.logout);

module.exports = router; 