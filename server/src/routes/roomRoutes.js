const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomById,
  updatePermissions,
  changeRole,
  removeParticipant,
} = require('../controllers/roomController');

const router = express.Router();
const checkpointRoutes = require('./checkpointRoutes');


router.use('/:id/checkpoints', checkpointRoutes);
router.use(protect);

router.post('/', createRoom);
router.post('/join', joinRoom);
router.get('/', getMyRooms);
router.get('/:id', getRoomById);
router.patch('/:id/participants/:userId/permissions', updatePermissions);
router.patch('/:id/participants/:userId/role', changeRole);
router.delete('/:id/participants/:userId', removeParticipant);

module.exports = router;