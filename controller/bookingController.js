const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Booking = require('../schema/bookingSchema');
const Apartment = require('../schema/ApartmentSchema');

const verifyAndAddBooking = async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({
      status: 'failed',
      message: 'Payment reference is required',
    });
  }

  try {
    // 1. Verify payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.paystacksecretkey}`,
        },
      }
    );

    const paymentData = response.data.data;

    if (paymentData.status !== 'success') {
      return res.status(400).json({
        status: 'failed',
        message: 'Payment not successful',
      });
    }

    // 2. Check if payment was already processed
    const existing = await Booking.findOne({
      'payment.reference': paymentData.reference,
    });

    if (existing) {
      return res.status(200).json({
        status: 'already verified',
        data: existing,
      });
    }

    // 3. Extract metadata
    const getMetadata = (key) => {
      return (
        paymentData.metadata?.custom_fields?.find(
          (field) => field.variable_name === key
        )?.value || ''
      );
    };

    const apartmentId = getMetadata('apartmentId');
    const checkIn = new Date(getMetadata('checkIn'));
    const checkOut = new Date(getMetadata('checkOut'));
    const guests = Number(getMetadata('guests'));

    // 4. Validate dates
    if (
      isNaN(checkIn.getTime()) ||
      isNaN(checkOut.getTime()) ||
      checkIn >= checkOut
    ) {
      return res.status(400).json({
        status: 'failed',
        message: 'Invalid booking dates',
      });
    }

    // 5. Start MongoDB transaction
    const session = await mongoose.startSession();

    try {
      let booking;

      await session.withTransaction(async () => {
        // 6. Get apartment inside transaction
        const apartment = await Apartment.findById(apartmentId).session(
          session
        );

        if (!apartment) {
          throw new Error('Apartment not found');
        }

        // 7. Check capacity
        if (guests < 1 || guests > apartment.capacity) {
          throw new Error('Number of guests exceeds apartment capacity');
        }

        // 8. Check overlapping bookings
        const overlappingBooking = await Booking.findOne({
          apartment: apartmentId,
          status: 'confirmed',
          checkIn: { $lt: checkOut },
          checkOut: { $gt: checkIn },
        }).session(session);

        if (overlappingBooking) {
          throw new Error(
            'Apartment is already booked for these dates'
          );
        }

        // 9. Calculate amount
        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        const nights = Math.ceil(
          (checkOut - checkIn) / millisecondsPerDay
        );

        const expectedAmount = apartment.cost * nights;
        const paidAmount = paymentData.amount / 100;

        if (paidAmount !== expectedAmount) {
          throw new Error(
            'Payment amount does not match booking amount'
          );
        }

        // 10. Generate booking reference
        const bookingReference = `BK-${crypto
          .randomBytes(4)
          .toString('hex')
          .toUpperCase()}`;

        // 11. Create booking
        const createdBooking = await Booking.create(
          [
            {
              bookingReference,

              apartment: apartmentId,

              guest: {
                name: getMetadata('name'),
                email: paymentData.customer.email
                  .toLowerCase()
                  .trim(),
                phone: getMetadata('phone'),
              },

              checkIn,
              checkOut,
              guests,
              totalAmount: paidAmount,

              payment: {
                reference: paymentData.reference,
                status: 'paid',
              },

              status: 'confirmed',
            },
          ],
          { session }
        );

        booking = createdBooking[0];
      });

      return res.status(201).json({
        status: 'success',
        data: booking,
      });
    } catch (error) {
      return res.status(400).json({
        status: 'failed',
        message: error.message,
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 'error',
      message: 'Verification failed',
    });
  }
};

const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('apartment', 'title images cost capacity')
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};

module.exports = {
  verifyAndAddBooking,
  getBookings
};
