const express = require('express');
const router = express.Router();
const { subscriptionMessage, sendSingleMessage, sendNewsLetter } = require('../controller/emailController');
const authenticator = require('../middleware/authenticator');

// router.post('/subscribe', subscriptionMessage);

router.post('/send_email', authenticator, sendSingleMessage);

router.post('/send_newsletter',authenticator,sendNewsLetter);

module.exports = router;