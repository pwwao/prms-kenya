import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined';
import { PageHeader, EmptyState } from '@/shared/components/ui';
import { MessageBubble } from '../components/MessageBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChat } from '../hooks/useChat';
import { useReferralDetail } from '@/features/referrals/hooks/useReferrals';
import { chatSocket } from '@/shared/api/chat-socket';
import { ROUTES } from '@/shared/constants/routes.constants';

const ChatPage: React.FC = () => {
  const { referralId } = useParams<{ referralId: string }>();
  const id = Number(referralId);
  const { data: referral } = useReferralDetail(id);
  const { messages, isLoading, typingUser, sendMessage, notifyTyping, currentUserId } = useChat(id);

  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(chatSocket.isConnected);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setIsConnected(chatSocket.isConnected), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  return (
    <Box display="flex" flexDirection="column" height="calc(100vh - 140px)">
      <PageHeader
        title={referral ? `Messages · ${referral.referralCode}` : 'Messages'}
        breadcrumbs={[
          { label: 'Referrals', href: ROUTES.REFERRALS },
          ...(referral ? [{ label: referral.referralCode, href: ROUTES.REFERRAL_DETAIL(referral.id) }] : []),
          { label: 'Messages' },
        ]}
      />

      <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box flex={1} overflow="auto" p={2}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : messages.length === 0 ? (
            <EmptyState title="No messages yet" body="Start the conversation about this referral." />
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.localId ?? message.id}
                message={message}
                isOwnMessage={message.sender.id === currentUserId}
              />
            ))
          )}
          <div ref={listEndRef} />
        </Box>

        <TypingIndicator userName={typingUser} />

        {!isConnected && (
          <Box display="flex" alignItems="center" gap={1} px={2} py={0.5} color="warning.main">
            <WifiOffOutlinedIcon fontSize="small" />
          </Box>
        )}

        <Box display="flex" alignItems="flex-end" gap={1} p={1.5} borderTop="1px solid" borderColor="divider">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Type a message…"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <IconButton color="primary" onClick={handleSend} disabled={!inputText.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatPage;
