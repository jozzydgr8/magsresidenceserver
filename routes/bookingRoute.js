const express = require('express');
const router = express.Router();

const { getBookings, verifyAndAddBooking } = require('../controller/bookingController');

router.get('/', getBookings);
router.post('/verify', verifyAndAddBooking);

module.exports = router;
