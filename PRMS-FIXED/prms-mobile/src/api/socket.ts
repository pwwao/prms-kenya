/**
 * Socket.IO Service — Real-time Chat
 * Architecture: /chat namespace, JWT auth handshake per API Reference.
 */
import { io, Socket } from 'socket.io-client';
import { APP_CONFIG } from '@constants/index';
import { tokenStorage } from '@utils/tokenStorage';
import type {
  SocketNewMessage,
  SocketMessageDelivered,
  SocketMessageRead,
  SocketUserTyping,
  SocketReferralStatusChanged,
} from '@types/index';

type EventCallback<T> = (data: T) => void;

class ChatSocketService {
  private socket: Socket | null = null;
  private currentRooms = new Set<number>();

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) return;

    this.socket = io(`${APP_CONFIG.WS_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      // Rejoin rooms after reconnection
      this.currentRooms.forEach((referralId) => {
        this.joinRoom(referralId);
      });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    this.socket.on('ERROR', (err: { code: string; message: string }) => {
      console.error('[Socket] Server error:', err);
      if (err.code === 'AUTH_TOKEN_EXPIRED') {
        this.disconnect();
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentRooms.clear();
  }

  joinRoom(referralId: number): void {
    if (!this.socket?.connected) return;
    this.socket.emit('JOIN_REFERRAL_ROOM', { referralId });
    this.currentRooms.add(referralId);
  }

  leaveRoom(referralId: number): void {
    this.currentRooms.delete(referralId);
  }

  sendMessage(referralId: number, content: string): void {
    this.socket?.emit('SEND_MESSAGE', { referralId, content });
  }

  startTyping(referralId: number): void {
    this.socket?.emit('TYPING_START', { referralId });
  }

  stopTyping(referralId: number): void {
    this.socket?.emit('TYPING_STOP', { referralId });
  }

  markMessagesRead(referralId: number): void {
    this.socket?.emit('MARK_MESSAGES_READ', { referralId });
  }

  // ─── Event subscriptions ───────────────────────────────────────────────────

  onNewMessage(callback: EventCallback<SocketNewMessage>): () => void {
    this.socket?.on('NEW_MESSAGE', callback);
    return () => this.socket?.off('NEW_MESSAGE', callback);
  }

  onMessageDelivered(callback: EventCallback<SocketMessageDelivered>): () => void {
    this.socket?.on('MESSAGE_DELIVERED', callback);
    return () => this.socket?.off('MESSAGE_DELIVERED', callback);
  }

  onMessageRead(callback: EventCallback<SocketMessageRead>): () => void {
    this.socket?.on('MESSAGE_READ', callback);
    return () => this.socket?.off('MESSAGE_READ', callback);
  }

  onUserTyping(callback: EventCallback<SocketUserTyping>): () => void {
    this.socket?.on('USER_TYPING', callback);
    return () => this.socket?.off('USER_TYPING', callback);
  }

  onUserStoppedTyping(callback: EventCallback<SocketUserTyping>): () => void {
    this.socket?.on('USER_STOPPED_TYPING', callback);
    return () => this.socket?.off('USER_STOPPED_TYPING', callback);
  }

  onReferralStatusChanged(callback: EventCallback<SocketReferralStatusChanged>): () => void {
    this.socket?.on('REFERRAL_STATUS_CHANGED', callback);
    return () => this.socket?.off('REFERRAL_STATUS_CHANGED', callback);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const chatSocket = new ChatSocketService();
