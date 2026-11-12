import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { logger } from './logger';
import type { AuthPayload } from './middleware/auth';

let io: SocketServer | null = null;

export function initSocket(server: import('http').Server) {
  io = new SocketServer(server, {
    cors: {
      origin: config.frontendUrl.split(',').map((s) => s.trim()),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Autenticación requerida'));
    }
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
      (socket.data as any).user = payload;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket.data as any).user as AuthPayload;
    logger.info('Socket connected', { userId: user.userId, role: user.role });

    socket.join(`user:${user.userId}`);

    socket.on('join_order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      logger.debug('Socket joined order room', { userId: user.userId, orderId });
    });

    socket.on('leave_order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
      logger.debug('Socket left order room', { userId: user.userId, orderId });
    });

    socket.on('send_message', (data: { order_id: string; content: string }) => {
      logger.debug('Socket send_message', { userId: user.userId, orderId: data.order_id });
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId: user.userId });
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io no está inicializado');
  return io;
}

export function emitNewMessage(orderId: string, message: any) {
  if (io) {
    io.to(`order:${orderId}`).emit('new_message', message);
  }
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitMessagesRead(orderId: string) {
  if (io) {
    io.to(`order:${orderId}`).emit('messages_read', { order_id: orderId });
  }
}
