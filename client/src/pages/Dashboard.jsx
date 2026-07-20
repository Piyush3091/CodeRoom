import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createRoom, joinRoom, getMyRooms } from '../api/rooms';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRooms = async () => {
    try {
      const res = await getMyRooms();
      setRooms(res.data.rooms);
    } catch (err) {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await createRoom(roomName);
      setRoomName('');
      navigate(`/room/${res.data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await joinRoom(joinCode);
      setJoinCode('');
      navigate(`/room/${res.data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room');
    }
  };

  return (
    <div>
      <h2>Welcome, {user?.name}</h2>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>

      <hr />

      <h3>Create a Room</h3>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Room name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
        />
        <button type="submit">Create</button>
      </form>

      <h3>Join a Room</h3>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          placeholder="Room code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          required
        />
        <button type="submit">Join</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>Your Rooms</h3>
      {loading ? (
        <p>Loading...</p>
      ) : rooms.length === 0 ? (
        <p>No rooms yet — create or join one above.</p>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room._id}>
              <a onClick={() => navigate(`/room/${room._id}`)} style={{ cursor: 'pointer' }}>
                {room.name}
              </a>{' '}
              — code: {room.code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;