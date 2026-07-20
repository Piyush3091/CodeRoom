import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { getRoomById } from '../api/rooms';
import { useAuth } from '../context/AuthContext';

const sanitize = (str) => String(str).replace(/["\\]/g, '');

const Room = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const decorationsRef = useRef([]);

  useEffect(() => {
    getRoomById(id)
      .then((res) => setRoom(res.data.room))
      .catch(() => setError('Could not load room, or you do not have access'));
  }, [id]);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      document.getElementById('remote-cursor-styles')?.remove();
    };
  }, []);

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
        .${className} {
          border-left: 2px solid ${color};
          position: relative;
        }
        .${className}::after {
          content: "${sanitize(name)}";
          position: absolute;
          top: -18px;
          left: -2px;
          background: ${color};
          color: #fff;
          font-size: 11px;
          line-height: 14px;
          padding: 1px 5px;
          border-radius: 3px;
          white-space: nowrap;
          z-index: 20;
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

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234', `coderoom-${id}`, ydoc);
    providerRef.current = provider;

    const yText = ydoc.getText('monaco');
    const binding = new MonacoBinding(yText, editor.getModel(), new Set([editor]), provider.awareness);
    bindingRef.current = binding;

    const myColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    provider.awareness.setLocalStateField('user', {
      name: user?.name || 'Anonymous',
      color: myColor,
    });

    editor.onDidChangeCursorPosition((e) => {
      provider.awareness.setLocalStateField('cursor', {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      const users = states.map((s) => s.user).filter(Boolean);
      setOnlineUsers(users);
      renderRemoteCursors();
    });
  };

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!room) return <p>Loading room...</p>;

  return (
    <div>
      <h2>{room.name}</h2>
      <p>Room code: {room.code}</p>
      <p>Participants:</p>
      <ul>
        {room.participants.map((p) => (
          <li key={p._id}>
            {p.user.name} ({p.role})
          </li>
        ))}
      </ul>

      <p>
        Online now:{' '}
        {onlineUsers.map((u, i) => (
          <span key={i} style={{ color: u.color, marginRight: 8 }}>
            ● {u.name}
          </span>
        ))}
      </p>

      <Editor height="500px" defaultLanguage="javascript" theme="vs-dark" onMount={handleEditorMount} />
    </div>
  );
};

export default Room;