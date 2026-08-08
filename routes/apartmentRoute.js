const router = require('express').Router();
const {getApartment, createApartment, updateApartment, deleteApartment} = require('../controller/ApartmentController');
const multerUpload = require('../config/multerConfig');


router.get('/', getApartment);
router.patch('/:id', multerUpload.array('images',3),updateApartment);
router.post('/', multerUpload.array('images',3), createApartment);
router.delete('/:id', deleteApartment);


module.exports = router;