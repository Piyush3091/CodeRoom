const axios = require('axios');
const Room = require('../models/Room');

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

// Map our editor's language selector values to Piston's language/version identifiers
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '20.11.1' },
  python: { language: 'python', version: '3.12.0' },
  cpp: { language: 'c++', version: '10.2.0' },
};
// POST /api/execute  { roomId, language, code }
const executeCode = async (req, res) => {
  try {
    const { roomId, language, code } = req.body;
    if (!roomId || !language || code === undefined) {
      return res.status(400).json({ message: 'roomId, language, and code are required' });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const participant = room.participants.find((p) => p.user.toString() === req.user.id);
    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant of this room' });
    }
    if (!participant.permissions.canExecute) {
      return res.status(403).json({ message: 'You do not have permission to execute code in this room' });
    }

    const mapping = LANGUAGE_MAP[language];
    if (!mapping) {
      return res.status(400).json({ message: `Unsupported language: ${language}` });
    }

    const pistonRes = await axios.post(`${PISTON_URL}/api/v2/execute`, {
      language: mapping.language,
      version: mapping.version,
      files: [{ content: code }],
    });

    res.json({ result: pistonRes.data.run });
  } catch (err) {
    res.status(500).json({ message: 'Code execution failed', error: err.message });
  }
};

module.exports = { executeCode };