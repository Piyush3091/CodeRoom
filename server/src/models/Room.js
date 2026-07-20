const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const generateRoomCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, default: () => generateRoomCode() },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['mentor', 'student'], required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);