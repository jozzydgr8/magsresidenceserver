const express = require('express');
const router = express.Router();

const { getBookings, verifyAndAddBooking, initializeBookingPayment, checkInBooking, checkOutBooking } = require('../controller/bookingController');

router.get('/', getBookings);
router.post('/verify', verifyAndAddBooking);
router.post('/initialize', initializeBookingPayment);
router.patch('/:id/check-in', checkInBooking);
router.patch('/:id/check-out', checkOutBooking);


module.exports = router;
