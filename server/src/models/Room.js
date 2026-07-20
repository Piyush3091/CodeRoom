const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const generateRoomCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

const defaultUserPermissions = () => ({
  canEdit: true,
  canExecute: false,
  canInvite: false,
  canViewHistory: false,
});

const adminPermissions = () => ({
  canEdit: true,
  canExecute: true,
  canInvite: true,
  canViewHistory: true,
});

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, default: () => generateRoomCode() },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['admin', 'user'], required: true },
        permissions: {
          canEdit: { type: Boolean, default: true },
          canExecute: { type: Boolean, default: false },
          canInvite: { type: Boolean, default: false },
          canViewHistory: { type: Boolean, default: false },
        },
      },
    ],
  },
  { timestamps: true }
);

roomSchema.statics.defaultUserPermissions = defaultUserPermissions;
roomSchema.statics.adminPermissions = adminPermissions;

module.exports = mongoose.model('Room', roomSchema);