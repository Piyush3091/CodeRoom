const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const setupYjsServer = (port) => {
  const server = http.createServer();
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (conn, req) => {
    setupWSConnection(conn, req);
  });

  server.listen(port, () => {
    console.log(`Yjs WebSocket server running on port ${port}`);
  });
};

module.exports = setupYjsServer;