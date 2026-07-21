import api from './axios';

export const createRoom = (name) => api.post('/rooms', { name });
export const joinRoom = (code) => api.post('/rooms/join', { code });
export const getMyRooms = () => api.get('/rooms');
export const getRoomById = (id) => api.get(`/rooms/${id}`);

export const updatePermissions = (roomId, userId, permissions) =>
  api.patch(`/rooms/${roomId}/participants/${userId}/permissions`, permissions);

export const changeRole = (roomId, userId, role) =>
  api.patch(`/rooms/${roomId}/participants/${userId}/role`, { role });

export const removeParticipant = (roomId, userId) =>
  api.delete(`/rooms/${roomId}/participants/${userId}`);

export const executeCode = (roomId, language, code) =>
  api.post('/execute', { roomId, language, code });