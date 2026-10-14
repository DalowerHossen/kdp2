// path: app/global-error.tsx
'use client';

import { en } from '@/lib/i18n/strings/en';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{en.states.errorTitle}</h1>
          <p>{en.states.errorBody}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: '0.375rem',
              background: '#2563eb',
              color: '#fff',
              padding: '0.5rem 1rem',
            }}
          >
            {en.states.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
