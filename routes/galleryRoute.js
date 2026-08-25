const {getGallery, createGallery, deleteGallery} = require('../controller/galleryController');
const Authenticator = require('../middleware/authenticator');
const router = require('express').Router();
const multerUpload = require('../config/multerConfig');

router.get('/', getGallery);
router.post('/', Authenticator,  multerUpload.single('image'), createGallery);
router.delete('/:id', Authenticator, deleteGallery);

module.exports = router