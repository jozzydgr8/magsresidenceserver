const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    
    
            image_url: {
                type: String,
                required: true
            },
            public_id: {
                type: String,
                required: true
            }
        

   
   
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically (Date type)
  }
);

module.exports = mongoose.model('Gallery', gallerySchema);