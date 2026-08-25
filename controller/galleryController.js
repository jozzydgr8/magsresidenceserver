const Gallery = require('../schema/gallerySchema');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

const getGallery = async (req,res )=>{
    try{
        const fetchGallery = await Gallery.find({});
        res.status(200).json(fetchGallery);
    }catch(error){
        res.status(400).json({message: error.message})
    }
}
const createGallery = async(req,res)=>{
    try{
        if(!req.file){
        return res.status(400).json({message:'No image file uploaded'});
    }

    const result = await cloudinary.uploader.upload(req.file.path);
    if(!result || result.public_id){
        return res.status(500).json({message:'cloudinary upload failed to yield public_id'});

    }
    const data = await Gallery.create({
        image_url:result.secure_url,
        public_id:result.public_id,
    })
    res.status(200).json(data)

    } catch(error){
        res.status(400).json({message:error.message})
    }

}

const deleteGallery = async(req,res)=>{
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(404).json({message:'Blog not found'});
    }
    try{
        const deleteGallery = await Gallery.findById(id);
        if(!deleteGallery){
            return res.status(404).json({message:'Gallery not found'});
        }
        await cloudinary.uploader.destroy(deleteGallery.public_id);
        await deleteGallery.deleteOne();
        res.status(200).json({message:'Blog deleted successfully'});
    }catch(error){
        res.status(500).json({message:error.message});
    }

}

module.exports = {createGallery, deleteGallery, getGallery}