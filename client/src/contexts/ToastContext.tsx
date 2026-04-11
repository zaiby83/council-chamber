import React, { createContext, useContext, useCallback } from 'react';
import {
  Toast,
  ToastTitle,
  ToastBody,
  Toaster,
  useToastController,
  useId,
  ToastIntent,
} from '@fluentui/react-components';

interface ToastContextValue {
  showToast: (title: string, message?: string, intent?: ToastIntent) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const showToast = useCallback(
    (title: string, message?: string, intent: ToastIntent = 'success') => {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {message && <ToastBody>{message}</ToastBody>}
        </Toast>,
        { intent, timeout: 4000 }
      );
    },
    [dispatchToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => showToast(title, message, 'success'),
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => showToast(title, message, 'error'),
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => showToast(title, message, 'warning'),
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => showToast(title, message, 'info'),
    [showToast]
  );

  const value: ToastContextValue = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      <Toaster toasterId={toasterId} position="top-end" />
      {children}
    </ToastContext.Provider>
  );
};
