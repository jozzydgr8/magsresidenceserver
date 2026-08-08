const router = require('express').Router();
const {getApartment, createApartment, updateApartment, deleteApartment} = require('../controller/ApartmentController');
const multerUpload = require('../config/multerConfig');
const authenticator = require('../middleware/authenticator');

router.get('/', getApartment);
router.patch('/:id', authenticator, multerUpload.array('images',3),updateApartment);
router.post('/', authenticator, multerUpload.array('images',3), createApartment);
router.delete('/:id', authenticator, deleteApartment);


module.exports = router;