const Apartment = require('../schema/ApartmentSchema');
const cloudinary = require('../config/cloudinary');

const getApartment = async (req, res) => {
    try {
        const fetchApartment = await Apartment.find({});
        res.status(200).json(fetchApartment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


const createApartment = async (req, res) => {
    try {
        const { title, description, cost } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'No images uploaded'
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

        const apartment = await Apartment.create({
            title,
            description,
            cost,
            images
        });

        res.status(201).json(apartment);

    } catch (error) {
        console.error('Create apartment error:', error);

        res.status(500).json({
            message: 'Failed to create apartment',
            error: error.message
        });
    }
};


const updateApartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, cost } = req.body;

          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'Blog not found' });
        }


        const apartment = await Apartment.findById(id);

        if (!apartment) {
            return res.status(404).json({
                message: 'Apartment not found'
            });
        }

        // Update text fields if they were provided
        if (title !== undefined) apartment.title = title;
        if (description !== undefined) apartment.description = description;
        if (cost !== undefined) apartment.cost = cost;

        // If new images were uploaded
        if (req.files && req.files.length > 0) {

            const uploadPromises = req.files.map(file =>
                cloudinary.uploader.upload(file.path)
            );

            const results = await Promise.all(uploadPromises);

            const images = results.map(result => ({
                url: result.secure_url,
                public_id: result.public_id
            }));

            apartment.images = images;
        }

        const updatedApartment = await apartment.save();

        res.status(200).json(updatedApartment);

    } catch (error) {
        console.error('Update apartment error:', error);

        res.status(500).json({
            message: 'Failed to update apartment',
            error: error.message
        });
    }
};

const deleteApartment = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: 'Invalid apartment ID'
            });
        }

        const apartment = await Apartment.findById(id);

        if (!apartment) {
            return res.status(404).json({
                message: 'Apartment not found'
            });
        }

        // Delete all apartment images from Cloudinary
        if (apartment.images && apartment.images.length > 0) {
            const deletePromises = apartment.images.map(image =>
                cloudinary.uploader.destroy(image.public_id)
            );

            await Promise.all(deletePromises);
        }

        // Delete apartment from MongoDB
        await Apartment.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Apartment and its images deleted successfully'
        });

    } catch (error) {
        console.error('Delete apartment error:', error);

        res.status(500).json({
            message: 'Failed to delete apartment',
            error: error.message
        });
    }
};




module.exports = {
    getApartment,
    createApartment,
    updateApartment,
    deleteApartment

};
