const express = require('express');
const router = express.Router();
const {  sendSingleMessage } = require('../controller/emailController');
const authenticator = require('../middleware/authenticator');



router.post('/send_email', authenticator, sendSingleMessage);



module.exports = router;