const Room = require('../models/Room');

// POST /api/rooms  (creator is always admin with full permissions)
const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await Room.create({
      name,
      createdBy: req.user.id,
      participants: [
        {
          user: req.user.id,
          role: 'admin',
          permissions: Room.adminPermissions(),
        },
      ],
    });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Room creation failed', error: err.message });
  }
};

// POST /api/rooms/join  { code }  (joiner is always a regular user)
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
        role: 'user',
        permissions: Room.defaultUserPermissions(),
      });
      await room.save();
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to join room', error: err.message });
  }
};

// GET /api/rooms
const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ 'participants.user': req.user.id }).sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rooms', error: err.message });
  }
};

// GET /api/rooms/:id
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('participants.user', 'name email');
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

// Helper: find requester's participant record + check admin
const requireAdmin = (room, userId) => {
  const requester = room.participants.find((p) => p.user.toString() === userId || p.user._id?.toString() === userId);
  return requester && requester.role === 'admin' ? requester : null;
};

// PATCH /api/rooms/:id/participants/:userId/permissions  (admin only)
const updatePermissions = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!requireAdmin(room, req.user.id)) {
      return res.status(403).json({ message: 'Only an admin can update permissions' });
    }

    const target = room.participants.find((p) => p.user.toString() === req.params.userId);
    if (!target) return res.status(404).json({ message: 'Participant not found in this room' });
    if (target.role === 'admin') {
      return res.status(400).json({ message: 'Admins always have full permissions' });
    }

    const { canEdit, canExecute, canInvite, canViewHistory } = req.body;
    if (canEdit !== undefined) target.permissions.canEdit = canEdit;
    if (canExecute !== undefined) target.permissions.canExecute = canExecute;
    if (canInvite !== undefined) target.permissions.canInvite = canInvite;
    if (canViewHistory !== undefined) target.permissions.canViewHistory = canViewHistory;

    await room.save();
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update permissions', error: err.message });
  }
};

// PATCH /api/rooms/:id/participants/:userId/role  (admin only)  body: { role: 'admin' | 'user' }
const changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or user' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!requireAdmin(room, req.user.id)) {
      return res.status(403).json({ message: 'Only an admin can change roles' });
    }

    const target = room.participants.find((p) => p.user.toString() === req.params.userId);
    if (!target) return res.status(404).json({ message: 'Participant not found in this room' });

    const adminCount = room.participants.filter((p) => p.role === 'admin').length;
    if (target.role === 'admin' && role === 'user' && adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot demote the only remaining admin' });
    }

    target.role = role;
    target.permissions = role === 'admin' ? Room.adminPermissions() : Room.defaultUserPermissions();

    await room.save();
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to change role', error: err.message });
  }
};

// DELETE /api/rooms/:id/participants/:userId  (admin only)
const removeParticipant = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (!requireAdmin(room, req.user.id)) {
      return res.status(403).json({ message: 'Only an admin can remove participants' });
    }

    const target = room.participants.find((p) => p.user.toString() === req.params.userId);
    if (!target) return res.status(404).json({ message: 'Participant not found in this room' });

    const adminCount = room.participants.filter((p) => p.role === 'admin').length;
    if (target.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot remove the only remaining admin' });
    }

    room.participants = room.participants.filter((p) => p.user.toString() !== req.params.userId);
    await room.save();
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove participant', error: err.message });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomById,
  updatePermissions,
  changeRole,
  removeParticipant,
};