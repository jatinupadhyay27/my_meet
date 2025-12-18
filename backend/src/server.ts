import { createServer } from 'http';
import app from './app';
import { ENV } from './config/env';
import { initializeSocket } from './modules/sockets/socket';

const port = ENV.PORT;

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.io server and attach to HTTP server
// Used for WebRTC signaling later
initializeSocket(httpServer);

// Start the server
httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Socket.io server initialized and ready for connections`);
});


