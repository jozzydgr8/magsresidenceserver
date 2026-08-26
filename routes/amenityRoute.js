const router = require('express').Router();
const {getAmenities, createAmenity, deleteAmenity,updateAmenity} = require('../controller/amenityController');
const multerUpload = require('../config/multerConfig');
const authenticator = require('../middleware/authenticator');

router.get('/', getAmenities);
router.post('/',authenticator, multerUpload.array('images',3), createAmenity);
router.patch('/:id', authenticator, multerUpload.array('images',3), updateAmenity);
router.delete('/:id', authenticator,deleteAmenity);

module.exports = router
