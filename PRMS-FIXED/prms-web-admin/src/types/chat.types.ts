/**
 * Chat types — mirrors PRMS mobile `ChatMessage` / Socket.IO event contracts.
 * See PRMS_API_Reference_v1.0.md §6 (REST history) + §9 (Socket.IO events).
 */

export interface MessageSender {
  id: number;
  fullName: string;
  hospitalName: string;
}

export interface ChatMessage {
  id: number;
  referralId: number;
  sender: MessageSender;
  content: string;
  isRead: boolean;
  createdAt: string;
  // Local-only tracking (optimistic UI)
  localId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface SocketNewMessage {
  id: number;
  referralId: number;
  sender: MessageSender;
  content: string;
  createdAt: string;
}

export interface SocketMessageDelivered {
  messageId: number;
  referralId: number;
}

export interface SocketMessageRead {
  messageId: number;
  referralId: number;
  readBy: { id: number; fullName: string };
  readAt: string;
}

export interface SocketUserTyping {
  referralId: number;
  user: { id: number; fullName: string };
}
