import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chat.api';
import { chatSocket } from '@/shared/api/chat-socket';
import { usePermissions } from '@/shared/hooks/usePermissions';
import type { ChatMessage } from '@/types/chat.types';

function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Loads chat history for a referral and keeps it live via the `/chat`
 * Socket.IO namespace — mirrors prms-mobile ChatScreen's message lifecycle
 * (send, deliver, read, typing indicator).
 */
export function useChat(referralId: number) {
  const { user } = usePermissions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['chat', referralId, 'history'],
    queryFn: async () => {
      const res = await chatApi.getHistory(referralId, { limit: 100 });
      return res.data;
    },
    enabled: !!referralId,
  });

  useEffect(() => {
    if (history) {
      setMessages(history.map((m) => ({ ...m, status: m.isRead ? 'read' : 'delivered' })));
    }
  }, [history]);

  useEffect(() => {
    if (!referralId) return;

    chatSocket.connect();
    chatSocket.joinRoom(referralId);
    chatSocket.markMessagesRead(referralId);

    const unsubNewMessage = chatSocket.onNewMessage((data) => {
      if (data.referralId !== referralId) return;

      setMessages((prev) => {
        const withoutOptimistic = prev.filter(
          (m) => !(m.localId && m.sender.id === data.sender.id && m.content === data.content),
        );
        return [
          ...withoutOptimistic,
          {
            id: data.id,
            referralId: data.referralId,
            sender: data.sender,
            content: data.content,
            isRead: data.sender.id === user?.id,
            createdAt: data.createdAt,
            status: data.sender.id === user?.id ? 'sent' : 'delivered',
          },
        ];
      });

      if (data.sender.id !== user?.id) {
        chatSocket.markMessagesRead(referralId);
      }
    });

    const unsubDelivered = chatSocket.onMessageDelivered((data) => {
      if (data.referralId !== referralId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: 'delivered' } : m)),
      );
    });

    const unsubRead = chatSocket.onMessageRead((data) => {
      if (data.referralId !== referralId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: 'read' } : m)),
      );
    });

    const unsubTyping = chatSocket.onUserTyping((data) => {
      if (data.referralId !== referralId || data.user.id === user?.id) return;
      setTypingUser(data.user.fullName);
    });

    const unsubStoppedTyping = chatSocket.onUserStoppedTyping((data) => {
      if (data.referralId !== referralId) return;
      setTypingUser(null);
    });

    return () => {
      chatSocket.leaveRoom(referralId);
      unsubNewMessage();
      unsubDelivered();
      unsubRead();
      unsubTyping();
      unsubStoppedTyping();
    };
  }, [referralId, user?.id]);

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !user) return;

      const optimisticMessage: ChatMessage = {
        id: -Date.now(),
        localId: generateLocalId(),
        referralId,
        sender: { id: user.id, fullName: user.fullName, hospitalName: user.hospitalName ?? '' },
        content: trimmed,
        isRead: false,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      chatSocket.stopTyping(referralId);
      chatSocket.sendMessage(referralId, trimmed);
    },
    [referralId, user],
  );

  const notifyTyping = useCallback(() => {
    chatSocket.startTyping(referralId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => chatSocket.stopTyping(referralId), 2000);
  }, [referralId]);

  return { messages, isLoading, typingUser, sendMessage, notifyTyping, currentUserId: user?.id };
}
