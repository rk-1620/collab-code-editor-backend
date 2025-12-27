import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import logger from './src/utils/logger.js';
import { registerSocketHandlers } from './src/sockets/index.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// basic real-time events (you can move to src/sockets later)
registerSocketHandlers(io)

httpServer.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

export { io };
