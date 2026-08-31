const Availability = require('../schema/availabilityBlock');
const Booking = require('../schema/bookingSchema');
const Apartment = require('../schema/ApartmentSchema');
const mongoose = require('mongoose');

// Create availability block
const createAvailabilityBlock = async (req, res) => {
  try {
    const { apartment, checkIn, checkOut } = req.body;

    if (!apartment || !checkIn || !checkOut) {
      return res.status(400).json({
        message: 'Apartment, check-in and check-out are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(apartment)) {
      return res.status(400).json({
        message: 'Invalid apartment ID',
      });
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid check-in or check-out date',
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        message: 'Check-out date must be after check-in date',
      });
    }

    // Make sure apartment exists
    const apartmentExists = await Apartment.exists({
      _id: apartment,
    });

    if (!apartmentExists) {
      return res.status(404).json({
        message: 'Apartment not found',
      });
    }

    // Check existing manual blocks
    const existingBlock = await Availability.findOne({
      apartment,
      checkIn: { $lt: endDate },
      checkOut: { $gt: startDate },
    });

    if (existingBlock) {
      return res.status(409).json({
        message: 'Apartment is already manually blocked for part of this period',
      });
    }

    // Check existing bookings
    const existingBooking = await Booking.findOne({
      apartment,
      status: {
        $in: ['confirmed', 'checked-in'],
      },
      checkIn: { $lt: endDate },
      checkOut: { $gt: startDate },
    });

    if (existingBooking) {
      return res.status(409).json({
        message: 'Apartment already has a booking for part of this period',
      });
    }

    const availability = await Availability.create({
      apartment,
      checkIn: startDate,
      checkOut: endDate,
    });

    return res.status(201).json({
      message: 'Apartment blocked successfully',
      availability,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create availability block',
      error: error.message,
    });
  }
};


// Get availability blocks
const getAvailabilityBlocks = async (req, res) => {
  try {
    const { apartment } = req.query;

    const filter = {};

    if (apartment) {
      if (!mongoose.Types.ObjectId.isValid(apartment)) {
        return res.status(400).json({
          message: 'Invalid apartment ID',
        });
      }

      filter.apartment = apartment;
    }

    const availability = await Availability.find(filter)
      .populate('apartment')
      .sort({ checkIn: 1 });

    return res.status(200).json({
      availability,
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to get availability blocks',
      error: error.message,
    });
  }
};


// Update availability block
const updateAvailabilityBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { apartment, checkIn, checkOut } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid availability block ID',
      });
    }

    const existingBlock = await Availability.findById(id);

    if (!existingBlock) {
      return res.status(404).json({
        message: 'Availability block not found',
      });
    }

    const newApartment = apartment || existingBlock.apartment;
    const newCheckIn = checkIn
      ? new Date(checkIn)
      : existingBlock.checkIn;
    const newCheckOut = checkOut
      ? new Date(checkOut)
      : existingBlock.checkOut;

    if (!mongoose.Types.ObjectId.isValid(newApartment)) {
      return res.status(400).json({
        message: 'Invalid apartment ID',
      });
    }

    if (
      isNaN(newCheckIn.getTime()) ||
      isNaN(newCheckOut.getTime())
    ) {
      return res.status(400).json({
        message: 'Invalid check-in or check-out date',
      });
    }

    if (newCheckIn >= newCheckOut) {
      return res.status(400).json({
        message: 'Check-out date must be after check-in date',
      });
    }

    // Make sure apartment exists
    const apartmentExists = await Apartment.exists({
      _id: newApartment,
    });

    if (!apartmentExists) {
      return res.status(404).json({
        message: 'Apartment not found',
      });
    }

    // Check for another manual block with overlapping dates
    const overlappingBlock = await Availability.findOne({
      _id: { $ne: id },
      apartment: newApartment,
      checkIn: { $lt: newCheckOut },
      checkOut: { $gt: newCheckIn },
    });

    if (overlappingBlock) {
      return res.status(409).json({
        message: 'Another availability block already covers part of this period',
      });
    }

    // Check bookings
    const existingBooking = await Booking.findOne({
      apartment: newApartment,
      status: {
        $in: ['confirmed', 'checked-in'],
      },
      checkIn: { $lt: newCheckOut },
      checkOut: { $gt: newCheckIn },
    });

    if (existingBooking) {
      return res.status(409).json({
        message: 'Apartment already has a booking for part of this period',
      });
    }

    existingBlock.apartment = newApartment;
    existingBlock.checkIn = newCheckIn;
    existingBlock.checkOut = newCheckOut;

    await existingBlock.save();

    return res.status(200).json({
      message: 'Availability block updated successfully',
      availability: existingBlock,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update availability block',
      error: error.message,
    });
  }
};


// Delete availability block
const deleteAvailabilityBlock = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid availability block ID',
      });
    }

    const availability = await Availability.findByIdAndDelete(id);

    if (!availability) {
      return res.status(404).json({
        message: 'Availability block not found',
      });
    }

    return res.status(200).json({
      message: 'Availability block deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete availability block',
      error: error.message,
    });
  }
};


module.exports = {
  createAvailabilityBlock,
  getAvailabilityBlocks,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
};
