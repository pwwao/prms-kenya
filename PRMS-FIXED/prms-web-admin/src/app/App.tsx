import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/shared/components/ui/Toast';
import { router } from './router';

/**
 * Root component. Provides:
 *  - RouterProvider        — all routes and lazy-loaded pages
 *  - ToastProvider         — app-wide toast notifications (useToast())
 *
 * Redux, MUI ThemeProvider, and QueryClientProvider are
 * applied above this in main.tsx.
 */
const App: React.FC = () => (
  <ToastProvider>
    <RouterProvider router={router} />
  </ToastProvider>
);

export default App;
