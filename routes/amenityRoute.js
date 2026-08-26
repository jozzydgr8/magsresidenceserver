const router = require('express').Router();
const {getAmenities, createAmenity, deleteAmenity,updateAmenity} = require('../controller/amenityController');
const multerUpload = require('../config/multerConfig');
const authenticator = require('../middleware/authenticator');

router.get('/', getAmenities);
router.post('/',authenticator, multerUpload.array('images',3), createAmenity);
router.patch('/', authenticator, multerUpload.array('images',3), updateAmenity);
router.delete('/', authenticator,multerUpload.array('images',3),deleteAmenity);

module.exports = router
