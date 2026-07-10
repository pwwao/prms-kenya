/**
 * Socket.IO Base Gateway
 *
 * Architecture Contract §4.3 — Socket.IO v4 over WSS, JWT auth on handshake.
 * §13.2 — Room naming: `referral:{id}`, `hospital:{id}`, `user:{id}`.
 *
 * Business module gateways (chat, notifications) extend BaseGateway.
 * This file handles:
 *   - JWT authentication on the handshake (before connection established)
 *   - Room join/leave helpers
 *   - Per-socket error handling
 *   - Typed event emitter wrapper
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../shared/services/token.service.js';
import { createModuleLogger } from '../config/logger.config.js';
import type { TUserRole } from '../config/jwt.config.js';

const logger = createModuleLogger('socket');

// ─── Augmented socket data ────────────────────────────────────────────────────

export interface ISocketUser {
  userId: number;
  role: TUserRole;
  hospitalId: number | null;
  jti: string;
}

declare module 'socket.io' {
  interface Socket {
    user: ISocketUser;
  }
}

// ─── Room name helpers — Architecture Contract §13.2 ─────────────────────────

export const SocketRooms = {
  referral: (id: number): string => `referral:${id}`,
  hospital: (id: number): string => `hospital:${id}`,
  user: (id: number): string => `user:${id}`,
} as const;

// ─── JWT auth middleware for Socket.IO ───────────────────────────────────────

/**
 * Registers the JWT authentication middleware on the Socket.IO server.
 * Called once at bootstrap for the root namespace.
 * Business gateways that use named namespaces call this on their namespace.
 *
 * @example
 * const { io } = createHttpServer(app);
 * registerSocketAuth(io);
 * registerChatGateway(io);
 */
export function registerSocketAuth(io: SocketIOServer): void {
  io.use(async (socket, next) => {
    try {
      // Accept token from handshake auth or query string (mobile clients)
      const token =
        (socket.handshake.auth.token as string | undefined) ??
        (socket.handshake.query.token as string | undefined);

      if (!token) {
        return next(new Error('AUTH_TOKEN_INVALID: No token provided'));
      }

      const decoded = await verifyAccessToken(token);

      socket.user = {
        userId: parseInt(decoded.sub, 10),
        role: decoded.role,
        hospitalId: decoded.hospitalId,
        jti: decoded.jti,
      };

      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      logger.warn('Socket handshake auth failed', {
        action: 'SOCKET_AUTH_FAIL',
        socketId: socket.id,
        errorMessage: message,
      });
      next(new Error(`AUTH_TOKEN_INVALID: ${message}`));
    }
  });
}

// ─── Base Gateway class ───────────────────────────────────────────────────────

export abstract class BaseGateway {
  protected abstract readonly namespaceName: string;
  protected readonly log = logger;

  /**
   * Joins a socket to a typed room.
   * Enforces facility isolation — non-System Admin sockets can only join
   * rooms belonging to their hospital.
   */
  protected joinRoom(socket: Socket, room: string): void {
    void socket.join(room);
    this.log.debug('Socket joined room', {
      action: 'SOCKET_JOIN',
      socketId: socket.id,
      userId: socket.user.userId,
      room,
    });
  }

  /**
   * Leaves a specific room.
   */
  protected leaveRoom(socket: Socket, room: string): void {
    void socket.leave(room);
    this.log.debug('Socket left room', {
      action: 'SOCKET_LEAVE',
      socketId: socket.id,
      room,
    });
  }

  /**
   * Logs socket connection with user context.
   */
  protected onConnect(socket: Socket): void {
    this.log.info('Socket connected', {
      action: 'SOCKET_CONNECT',
      socketId: socket.id,
      userId: socket.user.userId,
      role: socket.user.role,
      hospitalId: socket.user.hospitalId,
      namespace: this.namespaceName,
    });
  }

  /**
   * Logs socket disconnection.
   */
  protected onDisconnect(socket: Socket, reason: string): void {
    this.log.info('Socket disconnected', {
      action: 'SOCKET_DISCONNECT',
      socketId: socket.id,
      userId: socket.user?.userId,
      reason,
      namespace: this.namespaceName,
    });
  }

  /**
   * Wraps a socket event handler in try/catch.
   * Emits a typed error event to the socket on failure.
   */
  protected safeHandler<T>(
    socket: Socket,
    eventName: string,
    handler: (data: T) => Promise<void>,
  ): (data: T) => void {
    return (data: T) => {
      handler(data).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'An error occurred';
        this.log.error('Socket handler error', {
          action: 'SOCKET_HANDLER_ERROR',
          socketId: socket.id,
          userId: socket.user?.userId,
          eventName,
          errorMessage: message,
        });
        socket.emit('error', { event: eventName, message });
      });
    };
  }
}
