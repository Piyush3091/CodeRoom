const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createRoom, joinRoom, getMyRooms, getRoomById } = require('../controllers/roomController');

const router = express.Router();

router.use(protect); // all room routes require login

router.post('/', createRoom);
router.post('/join', joinRoom);
router.get('/', getMyRooms);
router.get('/:id', getRoomById);

module.exports = router;