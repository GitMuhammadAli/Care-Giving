'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#1A1A18',
          border: '1px solid #E8E7E3',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(26, 26, 24, 0.08)',
        },
        success: {
          iconTheme: {
            primary: '#3D8B6E',
            secondary: '#FFFFFF',
          },
          style: {
            borderLeft: '4px solid #3D8B6E',
          },
        },
        error: {
          iconTheme: {
            primary: '#C45C5C',
            secondary: '#FFFFFF',
          },
          style: {
            borderLeft: '4px solid #C45C5C',
          },
          duration: 6000,
        },
      }}
    />
  );
}

