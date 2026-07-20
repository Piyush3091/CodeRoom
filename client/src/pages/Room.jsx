import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { getRoomById, updatePermissions, changeRole, removeParticipant } from '../api/rooms';
import { useAuth } from '../context/AuthContext';

const sanitize = (str) => String(str).replace(/["\\]/g, '');

const PERMISSION_KEYS = ['canEdit', 'canExecute', 'canInvite', 'canViewHistory'];

const Room = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [actionError, setActionError] = useState('');

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const decorationsRef = useRef([]);

  const loadRoom = () => {
    getRoomById(id)
      .then((res) => setRoom(res.data.room))
      .catch(() => setError('Could not load room, or you do not have access'));
  };

  useEffect(() => {
    loadRoom();
  }, [id]);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      document.getElementById('remote-cursor-styles')?.remove();
    };
  }, []);

  // Find my own participant record to know my permissions
  const myParticipant = room?.participants.find((p) => p.user._id === user?.id);
  const isAdmin = myParticipant?.role === 'admin';
  const canEdit = myParticipant?.permissions?.canEdit ?? true;

  // Apply read-only state to Monaco whenever permissions change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: !canEdit });
    }
  }, [canEdit]);

  const renderRemoteCursors = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const provider = providerRef.current;
    if (!editor || !monaco || !provider) return;

    const myClientId = provider.awareness.clientID;
    const states = provider.awareness.getStates();

    const newDecorations = [];
    let css = '';

    states.forEach((state, clientId) => {
      if (clientId === myClientId) return;
      if (!state.cursor || !state.user) return;

      const { lineNumber, column } = state.cursor;
      const { name, color } = state.user;
      const className = `remote-cursor-${clientId}`;

      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });

      css += `
        .${className} { border-left: 2px solid ${color}; position: relative; }
        .${className}::after {
          content: "${sanitize(name)}";
          position: absolute; top: -18px; left: -2px;
          background: ${color}; color: #fff; font-size: 11px; line-height: 14px;
          padding: 1px 5px; border-radius: 3px; white-space: nowrap; z-index: 20;
          pointer-events: none;
        }
      `;
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    let styleTag = document.getElementById('remote-cursor-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'remote-cursor-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = css;
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({ readOnly: !canEdit });

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234', `coderoom-${id}`, ydoc);
    providerRef.current = provider;

    const yText = ydoc.getText('monaco');
    const binding = new MonacoBinding(yText, editor.getModel(), new Set([editor]), provider.awareness);
    bindingRef.current = binding;

    const myColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    provider.awareness.setLocalStateField('user', { name: user?.name || 'Anonymous', color: myColor });

    editor.onDidChangeCursorPosition((e) => {
      provider.awareness.setLocalStateField('cursor', {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      setOnlineUsers(states.map((s) => s.user).filter(Boolean));
      renderRemoteCursors();
    });
  };

  const handlePermissionToggle = async (participant, key) => {
    setActionError('');
    try {
      const newValue = !participant.permissions[key];
      await updatePermissions(id, participant.user._id, { [key]: newValue });
      loadRoom();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update permission');
    }
  };

  const handleRoleToggle = async (participant) => {
    setActionError('');
    try {
      const newRole = participant.role === 'admin' ? 'user' : 'admin';
      await changeRole(id, participant.user._id, newRole);
      loadRoom();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to change role');
    }
  };

  const handleRemove = async (participant) => {
    setActionError('');
    try {
      await removeParticipant(id, participant.user._id);
      loadRoom();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to remove participant');
    }
  };

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!room) return <p>Loading room...</p>;

  return (
    <div>
      <h2>{room.name}</h2>
      <p>Room code: {room.code}</p>

      {!canEdit && <p style={{ color: 'orange' }}>You have view-only access in this room.</p>}

      <p>
        Online now:{' '}
        {onlineUsers.map((u, i) => (
          <span key={i} style={{ color: u.color, marginRight: 8 }}>
            ● {u.name}
          </span>
        ))}
      </p>

      {isAdmin && (
        <div style={{ border: '1px solid #444', padding: 12, marginBottom: 12 }}>
          <h3>Admin Panel</h3>
          {actionError && <p style={{ color: 'red' }}>{actionError}</p>}
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                {PERMISSION_KEYS.map((k) => (
                  <th key={k}>{k}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {room.participants.map((p) => (
                <tr key={p._id}>
                  <td>{p.user.name}</td>
                  <td>{p.role}</td>
                  {PERMISSION_KEYS.map((k) => (
                    <td key={k}>
                      <input
                        type="checkbox"
                        checked={p.permissions[k]}
                        disabled={p.role === 'admin'}
                        onChange={() => handlePermissionToggle(p, k)}
                      />
                    </td>
                  ))}
                  <td>
                    <button onClick={() => handleRoleToggle(p)}>
                      {p.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                    <button onClick={() => handleRemove(p)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Editor height="500px" defaultLanguage="javascript" theme="vs-dark" onMount={handleEditorMount} />
    </div>
  );
};

export default Room;