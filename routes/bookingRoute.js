const express = require('express');
const router = express.Router();

const { getBookings, verifyAndAddBooking, initializeBookingPayment } = require('../controller/bookingController');

router.get('/', getBookings);
router.post('/verify', verifyAndAddBooking);
router.post('/initialize', initializeBookingPayment);

module.exports = router;
