import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Fade from '@mui/material/Fade';

interface TypingIndicatorProps {
  userName?: string | null;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => (
  <Fade in={!!userName} unmountOnExit>
    <Box px={2} py={0.5}>
      <Typography variant="caption" color="text.secondary" fontStyle="italic">
        {userName} is typing…
      </Typography>
    </Box>
  </Fade>
);
