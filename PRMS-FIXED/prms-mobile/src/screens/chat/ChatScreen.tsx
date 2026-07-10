/**
 * Chat Screen
 * Per PRMS_API_Reference §6 (REST history) + §9 (Socket.IO events).
 * Real-time messaging restricted to Clinician role per user flows doc.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Feather from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReferralStackParamList } from '@navigation/types';
import Screen from '@components/common/Screen';
import TextField from '@components/common/TextField';
import MessageBubble from '@components/chat/MessageBubble';
import TypingIndicator from '@components/chat/TypingIndicator';
import { LoadingView } from '@components/common/States';
import { Colors, Spacing, IconSize, Radius } from '@theme/tokens';
import { messagesApi } from '@api/services';
import { queryKeys } from '@api/queryClient';
import { chatSocket } from '@api/socket';
import { useAuth } from '@hooks/useAuth';
import { useSelector } from 'react-redux';
import type { RootState } from '@store/index';
import { generateLocalId } from '@utils/helpers';
import { APP_CONFIG } from '@constants/index';
import type { ChatMessage } from '@types/index';

type Props = NativeStackScreenProps<ReferralStackParamList, 'Chat'>;

export default function ChatScreen({ route }: Props) {
  const { referralId } = route.params;
  const { user } = useAuth();
  const isOnline = useSelector((s: RootState) => s.connectivity.isOnline);
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load history ─────────────────────────────────────────────────────────

  const { data: history, isLoading } = useQuery({
    queryKey: queryKeys.referrals.messages(referralId),
    queryFn: async () => {
      const res = await messagesApi.getHistory(referralId, { limit: APP_CONFIG.MESSAGES_PER_PAGE });
      return res.data.data;
    },
  });

  useEffect(() => {
    if (history) {
      setMessages(history.map((m) => ({ ...m, status: m.isRead ? 'read' : 'delivered' })));
    }
  }, [history]);

  // ─── Socket connection + room join ───────────────────────────────────────────

  useEffect(() => {
    chatSocket.connect();
    chatSocket.joinRoom(referralId);
    chatSocket.markMessagesRead(referralId);

    const unsubNewMessage = chatSocket.onNewMessage((data) => {
      if (data.referralId !== referralId) return;

      setMessages((prev) => {
        // De-duplicate against optimistic local message
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

      scrollToBottom();
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

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // ─── Send message ─────────────────────────────────────────────────────────

  const handleSend = () => {
    const content = inputText.trim();
    if (!content || !user) return;

    if (!isOnline) {
      // Chat requires live connection per architecture — inform user
      setMessages((prev) => [
        ...prev,
        {
          id: -Date.now(),
          localId: generateLocalId(),
          referralId,
          sender: { id: user.id, fullName: user.fullName, hospitalName: user.hospitalName ?? '' },
          content,
          isRead: false,
          createdAt: new Date().toISOString(),
          status: 'failed',
        },
      ]);
      setInputText('');
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: -Date.now(),
      localId: generateLocalId(),
      referralId,
      sender: { id: user.id, fullName: user.fullName, hospitalName: user.hospitalName ?? '' },
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    chatSocket.stopTyping(referralId);
    chatSocket.sendMessage(referralId, content);
    scrollToBottom();
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    chatSocket.startTyping(referralId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      chatSocket.stopTyping(referralId);
    }, APP_CONFIG.TYPING_DEBOUNCE_MS);
  };

  if (isLoading) return <LoadingView message="Loading conversation..." />;

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.localId ?? String(item.id)}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwnMessage={item.sender.id === user?.id} />
          )}
          onContentSizeChange={scrollToBottom}
        />

        <TypingIndicator visible={!!typingUser} userName={typingUser ?? undefined} />

        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Feather name="wifi-off" size={IconSize.xs} color={Colors.warning} />
          </View>
        )}

        <View style={styles.inputBar}>
          <TextField
            placeholder="Type a message..."
            value={inputText}
            onChangeText={handleTextChange}
            multiline
            containerStyle={styles.inputField}
            style={styles.inputText}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={IconSize.md} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messageList: { padding: Spacing.base, paddingBottom: Spacing.sm },
  offlineNotice: { alignItems: 'center', paddingVertical: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  inputField: { flex: 1, marginBottom: 0, marginRight: Spacing.sm },
  inputText: { maxHeight: 100 },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.gray300 },
});
