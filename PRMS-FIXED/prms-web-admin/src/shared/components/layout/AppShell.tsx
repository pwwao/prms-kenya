import React from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** Root authenticated layout — sidebar + topbar + routed page content. */
export const AppShell: React.FC = () => (
  <Box className="prms-app-shell">
    <Sidebar />
    <Box className="prms-main" component="main">
      <TopBar />
      <Box className="prms-page">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div id="main-content">
          <Outlet />
        </div>
      </Box>
    </Box>
  </Box>
);
