const Amenity = require('../schema/amenitiesSchema');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');


// =========================
// GET ALL AMENITIES
// =========================
const getAmenities = async (req, res) => {
    try {
        const amenities = await Amenity.find({}).lean();

        res.status(200).json(amenities);

    } catch (error) {
        console.error('Get amenities error:', error);

        res.status(500).json({
            message: 'Failed to get amenities',
            error: error.message
        });
    }
};


// =========================
// CREATE AMENITY
// =========================
const createAmenity = async (req, res) => {
    try {
        const { title, description } = req.body;

        // Check if images were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'No images uploaded'
            });
        }

        // Upload images to Cloudinary
        const uploadPromises = req.files.map(file =>
            cloudinary.uploader.upload(file.path)
        );

        const results = await Promise.all(uploadPromises);

        // Format images
        const images = results.map(result => ({
            url: result.secure_url,
            public_id: result.public_id
        }));

        // Create amenity
        const amenity = await Amenity.create({
            title,
            description,
            images
        });

        res.status(201).json(amenity);

    } catch (error) {
        console.error('Create amenity error:', error);

        res.status(500).json({
            message: 'Failed to create amenity',
            error: error.message
        });
    }
};


// =========================
// UPDATE AMENITY
// =========================
const updateAmenity = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, existingImages } = req.body;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                message: 'Amenity not found'
            });
        }

        // Find amenity
        const amenity = await Amenity.findById(id);

        if (!amenity) {
            return res.status(404).json({
                message: 'Amenity not found'
            });
        }

        // =========================
        // Update text fields
        // =========================

        if (title !== undefined) {
            amenity.title = title;
        }

        if (description !== undefined) {
            amenity.description = description;
        }


        // =========================
        // Update images
        // =========================

        if (existingImages !== undefined) {
            const keepImageIds = JSON.parse(existingImages);

            // Find images that are being removed
            const deletedImages = amenity.images.filter(
                image => !keepImageIds.includes(image._id.toString())
            );

            // Delete removed images from Cloudinary
            if (deletedImages.length > 0) {
                const deletePromises = deletedImages.map(image =>
                    cloudinary.uploader.destroy(image.public_id)
                );

                await Promise.all(deletePromises);
            }

            // Keep only images that were not deleted
            const remainingImages = amenity.images.filter(image =>
                keepImageIds.includes(image._id.toString())
            );

            // Upload new images
            let newImages = [];

            if (req.files && req.files.length > 0) {
                const uploadPromises = req.files.map(file =>
                    cloudinary.uploader.upload(file.path)
                );

                const results = await Promise.all(uploadPromises);

                newImages = results.map(result => ({
                    url: result.secure_url,
                    public_id: result.public_id
                }));
            }

            // Final image list
            amenity.images = [
                ...remainingImages,
                ...newImages
            ];
        }


        // Save updated amenity
        const updatedAmenity = await amenity.save();

        res.status(200).json(updatedAmenity);

    } catch (error) {
        console.error('Update amenity error:', error);

        res.status(500).json({
            message: 'Failed to update amenity',
            error: error.message
        });
    }
};


// =========================
// DELETE AMENITY
// =========================
const deleteAmenity = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: 'Invalid amenity ID'
            });
        }

        // Find amenity
        const amenity = await Amenity.findById(id);

        if (!amenity) {
            return res.status(404).json({
                message: 'Amenity not found'
            });
        }

        // =========================
        // Delete images from Cloudinary
        // =========================

        if (amenity.images && amenity.images.length > 0) {
            const deletePromises = amenity.images.map(image =>
                cloudinary.uploader.destroy(image.public_id)
            );

            await Promise.all(deletePromises);
        }

        // Delete amenity from MongoDB
        await Amenity.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Amenity and its images deleted successfully'
        });

    } catch (error) {
        console.error('Delete amenity error:', error);

        res.status(500).json({
            message: 'Failed to delete amenity',
            error: error.message
        });
    }
};


module.exports = {
    getAmenities,
    createAmenity,
    updateAmenity,
    deleteAmenity
};
