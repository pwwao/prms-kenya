/**
 * Chat Gateway — Socket.IO `/chat` Namespace
 *
 * Architecture Contract §13.4 — WebSocket Event Contracts (chat namespace).
 * §13.2 — Room naming: `referral:{id}`.
 * §10.3 — Facility isolation enforced via ChatService.assertAccess on every
 * room join and message send.
 *
 * Client → Server events: JOIN_REFERRAL_ROOM, SEND_MESSAGE, TYPING_START,
 * TYPING_STOP, MARK_READ (extension — see note below).
 * Server → Client events: NEW_MESSAGE, MESSAGE_DELIVERED, USER_TYPING,
 * REFERRAL_STATUS_CHANGED (re-broadcast by the Referral module via
 * `broadcastReferralStatusChanged`).
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { BaseGateway, SocketRooms } from '../../shared/base.gateway.js';
import { ChatService } from './chat.service.js';
import { z } from 'zod';

// ─── Payload schemas (Architecture Contract §13.4) ────────────────────────────

const joinRoomSchema = z.object({
  referralId: z.coerce.number().int().positive(),
});

const sendMessageSchema = z.object({
  referralId: z.coerce.number().int().positive(),
  content: z.string().trim().min(1).max(5000),
});

const typingSchema = z.object({
  referralId: z.coerce.number().int().positive(),
});

const markReadSchema = z.object({
  referralId: z.coerce.number().int().positive(),
});

// ─── Gateway ──────────────────────────────────────────────────────────────────

export class ChatGateway extends BaseGateway {
  protected readonly namespaceName = '/chat';

  private readonly chatService = new ChatService();

  /**
   * Registers all event handlers for a newly connected socket on `/chat`.
   */
  registerHandlers(socket: Socket): void {
    this.onConnect(socket);

    socket.on(
      'JOIN_REFERRAL_ROOM',
      this.safeHandler(socket, 'JOIN_REFERRAL_ROOM', async (data: unknown) => {
        const { referralId } = joinRoomSchema.parse(data);

        await this.chatService.assertAccess(referralId, socket.user.hospitalId);

        this.joinRoom(socket, SocketRooms.referral(referralId));
      }),
    );

    socket.on(
      'SEND_MESSAGE',
      this.safeHandler(socket, 'SEND_MESSAGE', async (data: unknown) => {
        const { referralId, content } = sendMessageSchema.parse(data);

        const message = await this.chatService.sendMessage({
          referralId,
          senderId: socket.user.userId,
          senderRole: socket.user.role,
          senderHospitalId: socket.user.hospitalId,
          content,
        });

        // Architecture Contract §13.4 — NEW_MESSAGE payload shape
        socket.nsp.to(SocketRooms.referral(referralId)).emit('NEW_MESSAGE', {
          messageId: message.messageId,
          referralId: message.referralId,
          senderId: message.senderId,
          content: message.content,
          createdAt: message.createdAt,
        });
      }),
    );

    socket.on(
      'TYPING_START',
      this.safeHandler(socket, 'TYPING_START', async (data: unknown) => {
        const { referralId } = typingSchema.parse(data);

        await this.chatService.assertAccess(referralId, socket.user.hospitalId);

        socket.nsp.to(SocketRooms.referral(referralId)).emit('USER_TYPING', {
          referralId,
          userId: socket.user.userId,
          username: `user_${socket.user.userId}`, // display name resolved client-side
          isTyping: true,
        });
      }),
    );

    socket.on(
      'TYPING_STOP',
      this.safeHandler(socket, 'TYPING_STOP', async (data: unknown) => {
        const { referralId } = typingSchema.parse(data);

        await this.chatService.assertAccess(referralId, socket.user.hospitalId);

        socket.nsp.to(SocketRooms.referral(referralId)).emit('USER_TYPING', {
          referralId,
          userId: socket.user.userId,
          username: `user_${socket.user.userId}`,
          isTyping: false,
        });
      }),
    );

    /**
     * MARK_READ — extension of §13.4 contract to support read receipts.
     * Marks all unread messages in a referral as read for this user and
     * emits MESSAGE_DELIVERED for each newly-read message so the original
     * sender's client can update delivery ticks.
     */
    socket.on(
      'MARK_READ',
      this.safeHandler(socket, 'MARK_READ', async (data: unknown) => {
        const { referralId } = markReadSchema.parse(data);

        const markedIds = await this.chatService.markAllAsRead(
          referralId,
          socket.user.userId,
          socket.user.hospitalId,
        );

        for (const messageId of markedIds) {
          socket.nsp.to(SocketRooms.referral(referralId)).emit('MESSAGE_DELIVERED', {
            messageId,
          });
        }
      }),
    );

    socket.on('disconnect', (reason: string) => {
      this.onDisconnect(socket, reason);
    });
  }
}

// ─── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers the `/chat` namespace and its connection handler on the
 * Socket.IO server. JWT auth (`registerSocketAuth`) must be applied to this
 * namespace before or as part of this call.
 *
 * @example
 * import { registerSocketAuth } from '../../shared/base.gateway.js';
 * import { registerChatGateway } from './chat.gateway.js';
 *
 * registerSocketAuth(io); // applies to root + can be re-applied per-namespace
 * registerChatGateway(io);
 */
export function registerChatGateway(io: SocketIOServer): void {
  const gateway = new ChatGateway();
  const namespace = io.of('/chat');

  namespace.on('connection', (socket: Socket) => {
    gateway.registerHandlers(socket);
  });
}
