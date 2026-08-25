const {getGallery, createGallery, deleteGallery} = require('../controller/galleryController');
const Authenticator = require('../middleware/authenticator');
const router = require('express').Router();
router.get('/', getGallery);
router.post('/', Authenticator, createGallery);
router.delete('/:id', Authenticator, deleteGallery);

module.exports = router