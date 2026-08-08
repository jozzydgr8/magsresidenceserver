const router = require('express').Router();
const multerUpload = require('../config/multerConfig');
const cloudinary = require('../config/cloudinary');
const Apartment = require('../schema/ApartmentSchema');


router.post('/single', multerUpload.single('image'), async (req, res) => {
  const { title, description,  cost } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image file uploaded'
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path);

    const data = await Apartment.create({
      title,
      description,
      cost,
      images: [
        {
          url: result.secure_url,
          public_id: result.public_id
        }
      ]
    });

    res.status(200).json(data);

  } catch (error) {
    console.error('Upload error:', error);

    res.status(500).json({
      message: 'Something went wrong',
      error: error.message
    });
  }
});



router.post('/multiple', multerUpload.array('images', 3), async (req, res) => {
    const { title, description, cost } = req.body;

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'No files uploaded'
            });
        }

        const uploadPromises = req.files.map(file =>
            cloudinary.uploader.upload(file.path)
        );

        const results = await Promise.all(uploadPromises);

        const images = results.map(result => ({
            url: result.secure_url,
            public_id: result.public_id
        }));

        const data = await Apartment.create({
            title,
            cost,
            description,
            images
        });

        res.status(200).json(data);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: 'Upload failed',
            error: err.message
        });
    }
});



module.exports=router;