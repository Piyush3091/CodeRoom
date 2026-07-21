const Checkpoint = require('../models/Checkpoint');
const Room = require('../models/Room');

const getParticipant = (room, userId) => room.participants.find((p) => p.user.toString() === userId);

// POST /api/rooms/:id/checkpoints  { label, content }
const createCheckpoint = async (req, res) => {
  try {
    const { label, content } = req.body;
    if (!label || content === undefined) {
      return res.status(400).json({ message: 'label and content are required' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const participant = getParticipant(room, req.user.id);
    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant of this room' });
    }

    const checkpoint = await Checkpoint.create({
      room: req.params.id,
      label,
      content,
      createdBy: req.user.id,
    });

    res.status(201).json({ checkpoint });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save checkpoint', error: err.message });
  }
};

// GET /api/rooms/:id/checkpoints  (requires canViewHistory)
const getCheckpoints = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const participant = getParticipant(room, req.user.id);
    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant of this room' });
    }
    if (!participant.permissions.canViewHistory) {
      return res.status(403).json({ message: 'You do not have permission to view checkpoints' });
    }

    const checkpoints = await Checkpoint.find({ room: req.params.id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    res.json({ checkpoints });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch checkpoints', error: err.message });
  }
};

// POST /api/rooms/:id/autosave  { content }  (no auth check on response needed - fire and forget from sendBeacon)
const autosave = async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) return res.status(400).end();

    await Room.findByIdAndUpdate(req.params.id, {
      autosave: { content, savedAt: new Date() },
    });

    res.status(204).end();
  } catch (err) {
    res.status(500).end();
  }
};

module.exports = { createCheckpoint, getCheckpoints, autosave };