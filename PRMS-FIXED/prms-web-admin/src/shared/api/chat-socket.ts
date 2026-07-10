/**
 * Socket.IO Service — Real-time Chat
 * Architecture: `/chat` namespace, JWT auth handshake per PRMS_API_Reference §9.
 * Mirrors prms-mobile/src/api/socket.ts so web and mobile share one contract.
 */

import { io, type Socket } from 'socket.io-client';
import { store } from '@/app/store';
import type {
  SocketNewMessage,
  SocketMessageDelivered,
  SocketMessageRead,
  SocketUserTyping,
} from '@/types/chat.types';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

type EventCallback<T> = (data: T) => void;

class ChatSocketService {
  private socket: Socket | null = null;
  private currentRooms = new Set<number>();

  connect(): void {
    if (this.socket?.connected) return;

    const { accessToken } = store.getState().auth;
    if (!accessToken) return;

    this.socket = io(`${WS_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      this.currentRooms.forEach((referralId) => this.joinRoom(referralId));
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

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const chatSocket = new ChatSocketService();
