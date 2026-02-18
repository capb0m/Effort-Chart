'use client';

import { createToaster, Toaster } from '@chakra-ui/react';

export const toaster = createToaster({
  placement: 'bottom-end',
});

export function ToasterComponent() {
  return (
    <Toaster toaster={toaster}>
      {(toast) => (
        <div
          data-type={toast.type}
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: toast.type === 'error' ? '#FC8181' : '#68D391',
            color: 'white',
            marginBottom: '8px',
          }}
        >
          {toast.title && <div style={{ fontWeight: 'bold' }}>{String(toast.title)}</div>}
          {toast.description && <div>{String(toast.description)}</div>}
        </div>
      )}
    </Toaster>
  );
}
