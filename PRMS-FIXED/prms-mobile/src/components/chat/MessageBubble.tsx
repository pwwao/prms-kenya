/**
 * MessageBubble — chat message display component
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Colors, Typography, Spacing, Radius, IconSize } from '@theme/tokens';
import { formatTime } from '@utils/helpers';
import type { ChatMessage } from '@types/index';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isOwnMessage ? styles.rowOutgoing : styles.rowIncoming]}>
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.bubbleOutgoing : styles.bubbleIncoming,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.senderName}>{message.sender.fullName}</Text>
        )}

        <Text style={isOwnMessage ? styles.textOutgoing : styles.textIncoming}>
          {message.content}
        </Text>

        <View style={styles.metaRow}>
          <Text style={isOwnMessage ? styles.timeOutgoing : styles.timeIncoming}>
            {formatTime(message.createdAt)}
          </Text>

          {isOwnMessage && <MessageStatusIcon status={message.status ?? 'sent'} />}
        </View>
      </View>
    </View>
  );
}

function MessageStatusIcon({ status }: { status: ChatMessage['status'] }) {
  if (status === 'sending') {
    return <Feather name="clock" size={IconSize.xs} color={Colors.chatOutgoingText} style={styles.statusIcon} />;
  }
  if (status === 'failed') {
    return <Feather name="alert-circle" size={IconSize.xs} color={Colors.error} style={styles.statusIcon} />;
  }
  if (status === 'read') {
    return <Feather name="check-circle" size={IconSize.xs} color={Colors.chatOutgoingText} style={styles.statusIcon} />;
  }
  // sent or delivered
  return <Feather name="check" size={IconSize.xs} color={Colors.chatOutgoingText} style={styles.statusIcon} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: Spacing.sm },
  rowOutgoing: { justifyContent: 'flex-end' },
  rowIncoming: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleOutgoing: { backgroundColor: Colors.chatOutgoing, borderBottomRightRadius: 4 },
  bubbleIncoming: { backgroundColor: Colors.chatIncoming, borderBottomLeftRadius: 4 },
  senderName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semiBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  textOutgoing: { fontSize: Typography.fontSize.base, color: Colors.chatOutgoingText },
  textIncoming: { fontSize: Typography.fontSize.base, color: Colors.chatIncomingText },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeOutgoing: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  timeIncoming: { fontSize: 10, color: Colors.textTertiary },
  statusIcon: { marginLeft: 4 },
});
