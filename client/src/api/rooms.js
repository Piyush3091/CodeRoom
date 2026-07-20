import api from './axios';

export const createRoom = (name) => api.post('/rooms', { name });
export const joinRoom = (code) => api.post('/rooms/join', { code });
export const getMyRooms = () => api.get('/rooms');
export const getRoomById = (id) => api.get(`/rooms/${id}`);