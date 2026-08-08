const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },
    
    images: [
        {
            url: {
                type: String,
                required: true
            },
            public_id: {
                type: String,
                required: true
            }
        }
    ],

    cost:{
      type: Number,
      required:true,
    },
   
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically (Date type)
  }
);

module.exports = mongoose.model('Apartment', apartmentSchema);