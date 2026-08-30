const mongoose = require('mongoose');

const availabilityBlockSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true,
    },

    checkIn: {
      type: Date,
      required: true,
    },

    checkOut: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'AvailabilityBlock',
  availabilityBlockSchema
);