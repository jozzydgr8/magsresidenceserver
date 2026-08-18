const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Booking = require('../schema/bookingSchema');
const Apartment = require('../schema/ApartmentSchema');

const verifyAndAddBooking = async (req, res) => {
  const { reference } = req.body;

  // 1. Make sure Paystack reference was provided
  if (!reference) {
    return res.status(400).json({
      status: 'failed',
      message: 'Payment reference is required',
    });
  }

  try {
    // 2. Verify payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.paystacksecretkey}`,
        },
      }
    );

    const paymentData = response.data.data;

    // 3. Make sure payment was successful
    if (paymentData.status !== 'success') {
      return res.status(400).json({
        status: 'failed',
        message: 'Payment not successful',
      });
    }

    // 4. Check if this payment has already created a booking
    const existing = await Booking.findOne({
      'payment.reference': paymentData.reference,
    });

    if (existing) {
      return res.status(200).json({
        status: 'already verified',
        data: existing,
      });
    }

    // 5. Helper to get Paystack metadata
    const getMetadata = (key) => {
      return (
        paymentData.metadata?.custom_fields?.find(
          (field) => field.variable_name === key
        )?.value || ''
      );
    };

    // 6. Get booking information from metadata
    const apartmentId = getMetadata('apartmentId');
    const checkIn = new Date(getMetadata('checkIn'));
    const checkOut = new Date(getMetadata('checkOut'));

    const name = getMetadata('name');
    const phone = getMetadata('phone');

    // 7. Validate apartment ID
    if (!apartmentId) {
      return res.status(400).json({
        status: 'failed',
        message: 'Apartment ID is required',
      });
    }

    // 8. Validate customer information
    const email = paymentData.customer?.email;

    if (!email) {
      return res.status(400).json({
        status: 'failed',
        message: 'Customer email not found',
      });
    }

    if (!name || !phone) {
      return res.status(400).json({
        status: 'failed',
        message: 'Customer name and phone are required',
      });
    }

    // 9. Validate booking dates
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

    // 10. Start MongoDB transaction
    const session = await mongoose.startSession();

    try {
      let booking;

      await session.withTransaction(async () => {

        // 11. Find apartment
        const apartment = await Apartment.findById(apartmentId).session(
          session
        );

        if (!apartment) {
          throw new Error('Apartment not found');
        }

        // 12. Check if apartment is already booked
        const overlappingBooking = await Booking.findOne({
          apartment: apartmentId,
          status: 'confirmed',

          checkIn: {
            $lt: checkOut,
          },

          checkOut: {
            $gt: checkIn,
          },
        }).session(session);

        if (overlappingBooking) {
          throw new Error(
            'Apartment is already booked for these dates'
          );
        }

        // 13. Calculate number of nights
        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        const nights = Math.ceil(
          (checkOut - checkIn) / millisecondsPerDay
        );

        // 14. Calculate expected payment
        const expectedAmount = apartment.cost * nights;

        // Paystack amount is stored in kobo
        const paidAmount = paymentData.amount / 100;

        // 15. Make sure customer paid the correct amount
        if (paidAmount !== expectedAmount) {
          throw new Error(
            'Payment amount does not match booking amount'
          );
        }

        // 16. Generate booking reference
        const bookingReference = `BK-${crypto
          .randomBytes(4)
          .toString('hex')
          .toUpperCase()}`;

        // 17. Create booking
        const createdBooking = await Booking.create(
          [
            {
              bookingReference,

              apartment: apartmentId,

              guest: {
                name: name.trim(),

                email: email
                  .toLowerCase()
                  .trim(),

                phone: phone.trim(),
              },

              checkIn,
              checkOut,

              totalAmount: paidAmount,

              payment: {
                reference: paymentData.reference,
                status: 'paid',
              },

              status: 'confirmed',
            },
          ],
          {
            session,
          }
        );

        booking = createdBooking[0];
      });

      // 18. Return successful booking
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


// GET ALL BOOKINGS
const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate(
        'apartment',
        'title images cost capacity'
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json(bookings);

  } catch (error) {

    res.status(400).json({
      message: error.message,
    });
  }
};


module.exports = {
  verifyAndAddBooking,
  getBookings,
};
