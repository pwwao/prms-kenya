import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { type AlertColor } from '@mui/material/Alert';

interface ToastItem {
  id: string;
  severity: AlertColor;
  title: string;
}

interface ToastContextValue {
  success: (title: string) => void;
  error: (title: string) => void;
  warning: (title: string) => void;
  info: (title: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * App-wide toast notification provider. Wrap <App /> with this once;
 * call useToast() anywhere to fire a notification.
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((severity: AlertColor, title: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, severity, title }]);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const value: ToastContextValue = {
    success: (title) => push('success', title),
    error:   (title) => push('error', title),
    warning: (title) => push('warning', title),
    info:    (title) => push('info', title),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast, i) => (
        <Snackbar
          key={toast.id}
          open
          autoHideDuration={4000}
          onClose={() => dismiss(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: `${24 + i * 64}px !important` }}
        >
          <Alert severity={toast.severity} variant="filled" onClose={() => dismiss(toast.id)}>
            {toast.title}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
