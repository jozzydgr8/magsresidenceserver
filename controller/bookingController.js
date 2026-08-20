const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Booking = require('../schema/bookingSchema');
const Apartment = require('../schema/ApartmentSchema');
const sendEmail = require('../config/mailer');

const initializeBookingPayment = async (req, res) => {
  const {
    apartmentId,
    checkIn,
    checkOut,
    name,
    email,
    phone,
  } = req.body;

  // 1. Validate required fields
  if (
    !apartmentId ||
    !checkIn ||
    !checkOut ||
    !name ||
    !email ||
    !phone
  ) {
    return res.status(400).json({
      status: 'failed',
      message: 'All booking information is required',
    });
  }

  try {
    // 2. Find apartment
    const apartment = await Apartment.findById(apartmentId);

    if (!apartment) {
      return res.status(404).json({
        status: 'failed',
        message: 'Apartment not found',
      });
    }

    // 3. Convert dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // 4. Validate dates
    if (
      isNaN(checkInDate.getTime()) ||
      isNaN(checkOutDate.getTime()) ||
      checkInDate >= checkOutDate
    ) {
      return res.status(400).json({
        status: 'failed',
        message: 'Invalid booking dates',
      });
    }

    // 5. Check apartment availability
    const overlappingBooking = await Booking.findOne({
      apartment: apartmentId,

      status: 'confirmed',

      checkIn: {
        $lt: checkOutDate,
      },

      checkOut: {
        $gt: checkInDate,
      },
    });

    if (overlappingBooking) {
      return res.status(400).json({
        status: 'failed',
        message: 'Apartment is already booked for these dates',
      });
    }

    // 6. Calculate number of nights
    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const nights = Math.ceil(
      (checkOutDate - checkInDate) /
        millisecondsPerDay
    );

    // 7. Calculate trusted amount from database
    const totalAmount = apartment.cost * nights;

    // Paystack expects amount in kobo
    const amountInKobo = Math.round(totalAmount * 100);

    // 8. Initialize Paystack transaction
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email.trim().toLowerCase(),

        amount: amountInKobo,

        currency: 'NGN',

        metadata: {
          custom_fields: [
            {
              display_name: 'Apartment ID',
              variable_name: 'apartmentId',
              value: apartment._id.toString(),
            },

            {
              display_name: 'Check-in',
              variable_name: 'checkIn',
              value: checkInDate.toISOString(),
            },

            {
              display_name: 'Check-out',
              variable_name: 'checkOut',
              value: checkOutDate.toISOString(),
            },

            {
              display_name: 'Guest Name',
              variable_name: 'name',
              value: name.trim(),
            },

            {
              display_name: 'Guest Phone',
              variable_name: 'phone',
              value: phone.trim(),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.paystacksecretkey}`,

          'Content-Type': 'application/json',
        },
      }
    );

    // 9. Make sure Paystack initialized successfully
    if (!response.data.status) {
      return res.status(400).json({
        status: 'failed',
        message: 'Unable to initialize payment',
      });
    }

    // 10. Return payment information to frontend
    return res.status(200).json({
      status: 'success',

      data: {
        access_code: response.data.data.access_code,

        authorization_url:
          response.data.data.authorization_url,

        reference:
          response.data.data.reference,

        amount: totalAmount,

        nights,
      },
    });

  } catch (error) {
  console.error(
    'PAYSTACK INITIALIZATION ERROR:',
    error.response?.data || error.message
  );

  return res.status(500).json({
    status: 'error',
    message:
      error.response?.data?.message ||
      error.message ||
      'Payment initialization failed',
  });
}
};

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
    
// ------------------------------------------
// RETURN SUCCESS
// ------------------------------------------

     
const session = await mongoose.startSession();

try {
  let booking;
  let apartment;

  await session.withTransaction(async () => {

    // Find apartment
    apartment = await Apartment.findById(apartmentId)
      .session(session);

    if (!apartment) {
      throw new Error('Apartment not found');
    }

    // Check if apartment is already booked
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

    // Calculate nights
    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const nights = Math.ceil(
      (checkOut - checkIn) / millisecondsPerDay
    );

    // Calculate expected payment from database
    const expectedAmount =
      apartment.cost * nights;

    // Paystack amount is in kobo
    const paidAmount =
      paymentData.amount / 100;

    // Verify payment amount
    if (paidAmount !== expectedAmount) {
      throw new Error(
        'Payment amount does not match booking amount'
      );
    }

    // Generate booking reference
    const bookingReference =
      `BK-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;

    // Create booking
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

  // ==========================================
  // TRANSACTION SUCCESSFULLY COMMITTED
  // ==========================================

  try {
    await sendEmail({
      recipient_email: booking.guest.email,

      subject:
        `Booking Confirmation - ${booking.bookingReference}`,

      message: `
        <div style="
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: auto;
        ">

          <h2 style="color: #b08d57;">
            Booking Confirmed
          </h2>

          <p>
            Dear ${booking.guest.name},
          </p>

          <p>
            Thank you for your booking.
            Your payment has been successfully received
            and your reservation is confirmed.
          </p>

          <div style="
            background: #f7f7f7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          ">

            <p>
              <strong>Booking Reference:</strong><br>
              ${booking.bookingReference}
            </p>

            <p>
              <strong>Apartment:</strong><br>
              ${apartment.title}
            </p>

            <p>
              <strong>Check-in:</strong><br>
              ${checkIn.toLocaleDateString()}
            </p>

            <p>
              <strong>Check-out:</strong><br>
              ${checkOut.toLocaleDateString()}
            </p>

            <p>
              <strong>Total Amount:</strong><br>
              ₦${paidAmount.toLocaleString()}
            </p>

          </div>

          <p>
            Please keep your booking reference for your records:
          </p>

          <h3 style="color: #b08d57;">
            ${booking.bookingReference}
          </h3>

          <p>
            We look forward to welcoming you.
          </p>

          <p>
            Kind regards,<br>
            Mags Residences
          </p>

        </div>
      `,
    });

    console.log(
      `Confirmation email sent to ${booking.guest.email}`
    );

  } catch (emailError) {

    // Booking is already saved.
    // Email failure should NOT cancel the booking.
    console.error(
      'BOOKING CONFIRMATION EMAIL FAILED:',
      emailError
    );
  }

  // ==========================================
  // RETURN SUCCESS
  // ==========================================

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


// CHECK IN GUEST
const checkInBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id).populate(
      'apartment',
      'title'
    );

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Booking not found',
      });
    }

    // Guest can only check in if booking is confirmed
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        status: 'failed',
        message: `Booking cannot be checked in because its current status is ${booking.status}`,
      });
    }

    // Update booking
    booking.status = 'checked-in';
    booking.checkedInAt = new Date();

    await booking.save();

    // ==========================================
    // SEND CHECK-IN EMAIL
    // ==========================================

    try {
      await sendEmail({
        recipient_email: booking.guest.email,

        subject: `Welcome to Mags Residences - ${booking.bookingReference}`,

        message: `
          <div style="
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: auto;
          ">

            <h2 style="color: #b08d57;">
              Welcome to Mags Residences
            </h2>

            <p>
              Dear ${booking.guest.name},
            </p>

            <p>
              Welcome! You have successfully checked in
              and your stay has now begun.
            </p>

            <div style="
              background: #f7f7f7;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            ">

              <p>
                <strong>Booking Reference:</strong><br>
                ${booking.bookingReference}
              </p>

              <p>
                <strong>Apartment:</strong><br>
                ${booking.apartment.title}
              </p>

              <p>
                <strong>Check-in:</strong><br>
                ${booking.checkIn.toLocaleDateString()}
              </p>

              <p>
                <strong>Check-out:</strong><br>
                ${booking.checkOut.toLocaleDateString()}
              </p>

            </div>

            <p>
              We hope you have a wonderful and comfortable stay.
            </p>

            <p>
              Kind regards,<br>
              Mags Residences
            </p>

          </div>
        `,
      });

      console.log(
        `Check-in email sent to ${booking.guest.email}`
      );

    } catch (emailError) {

      // Guest is already checked in.
      // Email failure should NOT undo the check-in.
      console.error(
        'CHECK-IN EMAIL FAILED:',
        emailError
      );
    }

    return res.status(200).json({
      status: 'success',
      message: 'Guest checked in successfully',
      data: booking,
    });

  } catch (error) {
    console.error('CHECK-IN ERROR:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to check in guest',
    });
  }
};


// CHECK OUT GUEST
const checkOutBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id).populate(
      'apartment',
      'title'
    );

    if (!booking) {
      return res.status(404).json({
        status: 'failed',
        message: 'Booking not found',
      });
    }

    // Guest must have checked in first
    if (booking.status !== 'checked-in') {
      return res.status(400).json({
        status: 'failed',
        message: `Booking cannot be checked out because its current status is ${booking.status}`,
      });
    }

    // Update booking
    booking.status = 'completed';
    booking.checkedOutAt = new Date();

    await booking.save();

    // ==========================================
    // SEND CHECK-OUT EMAIL
    // ==========================================

    try {
      await sendEmail({
        recipient_email: booking.guest.email,

        subject: `Thank You for Staying With Us - ${booking.bookingReference}`,

        message: `
          <div style="
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: auto;
          ">

            <h2 style="color: #b08d57;">
              Thank You for Staying With Us
            </h2>

            <p>
              Dear ${booking.guest.name},
            </p>

            <p>
              Your stay at Mags Residences has now been
              completed successfully.
            </p>

            <div style="
              background: #f7f7f7;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            ">

              <p>
                <strong>Booking Reference:</strong><br>
                ${booking.bookingReference}
              </p>

              <p>
                <strong>Apartment:</strong><br>
                ${booking.apartment.title}
              </p>

              <p>
                <strong>Check-in:</strong><br>
                ${booking.checkIn.toLocaleDateString()}
              </p>

              <p>
                <strong>Check-out:</strong><br>
                ${booking.checkOut.toLocaleDateString()}
              </p>

            </div>

            <p>
              Thank you for choosing Mags Residences.
              We hope to welcome you again in the future.
            </p>

            <p>
              Kind regards,<br>
              Mags Residences
            </p>

          </div>
        `,
      });

      console.log(
        `Check-out email sent to ${booking.guest.email}`
      );

    } catch (emailError) {

      // Booking is already completed.
      // Email failure should NOT undo the checkout.
      console.error(
        'CHECK-OUT EMAIL FAILED:',
        emailError
      );
    }

    return res.status(200).json({
      status: 'success',
      message: 'Guest checked out successfully',
      data: booking,
    });

  } catch (error) {
    console.error('CHECK-OUT ERROR:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Unable to check out guest',
    });
  }
};



module.exports = {
  verifyAndAddBooking,
  getBookings,
  initializeBookingPayment,
  checkInBooking,
  checkOutBooking
};
