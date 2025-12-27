import logger from '../utils/logger.js';

export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join-workspace', ({ workspaceId, userId }) => {
      socket.join(`workspace:${workspaceId}`);
      socket.to(`workspace:${workspaceId}`).emit('user-joined', {
        userId,
        timestamp: Date.now()
      });
    });

    socket.on('file-change', ({ workspaceId, delta, version }) => {
      socket.to(`workspace:${workspaceId}`).emit('content-updated', {
        delta,
        version
      });
    });

    socket.on('cursor-update', ({ workspaceId, position, userId }) => {
      socket.to(`workspace:${workspaceId}`).emit('cursor-moved', {
        userId,
        position
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};
