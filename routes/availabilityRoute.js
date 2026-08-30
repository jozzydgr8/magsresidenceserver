const {
  createAvailabilityBlock,
  getAvailabilityBlocks,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
} = require('../controller/availabilityController');
const router = require('express').Router();
const Authenticator = require('../middleware/authenticator');

router.get('/', getAvailabilityBlocks);
router.patch('/:id', Authenticator, updateAvailabilityBlock);
router.post('/', Authenticator, createAvailabilityBlock);
router.delete('/:id', Authenticator, deleteAvailabilityBlock)

module.exports = router;