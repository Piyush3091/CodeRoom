const Room = require('../models/Room');

// POST /api/rooms  (creator becomes a participant with their own role — usually mentor)
const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await Room.create({
      name,
      createdBy: req.user.id,
      participants: [{ user: req.user.id, role: req.user.role === 'mentor' ? 'mentor' : 'student' }],
    });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Room creation failed', error: err.message });
  }
};

// POST /api/rooms/join  { code }
const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Room code is required' });
    }

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const alreadyIn = room.participants.some((p) => p.user.toString() === req.user.id);
    if (!alreadyIn) {
      room.participants.push({
        user: req.user.id,
        role: req.user.role === 'mentor' ? 'mentor' : 'student',
      });
      await room.save();
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to join room', error: err.message });
  }
};

// GET /api/rooms  (rooms the logged-in user belongs to)
const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ 'participants.user': req.user.id }).sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rooms', error: err.message });
  }
};

// GET /api/rooms/:id  (single room detail — used later for the actual editor page)
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('participants.user', 'name email role');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isParticipant = room.participants.some((p) => p.user._id.toString() === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant of this room' });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch room', error: err.message });
  }
};

module.exports = { createRoom, joinRoom, getMyRooms, getRoomById };