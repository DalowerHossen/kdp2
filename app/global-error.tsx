// path: app/global-error.tsx
'use client';

import type { ReactElement } from 'react';
import './globals.css';

interface GlobalError {
  readonly digest?: string;
}

interface GlobalErrorProps {
  readonly error: Error & GlobalError;
  readonly reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: GlobalErrorProps): ReactElement {
  return (
    <html lang="en" data-theme="system">
      <body className="app-document">
        <main id="main-content" className="page-state" role="alert">
          <h1>The application could not load</h1>
          <p>A temporary issue interrupted this request. Try again, or return to the home page.</p>
          {error.digest === undefined ? null : <p>Reference: {error.digest}</p>}
          <div className="page-state-actions">
            <button className="button button-primary" onClick={reset} type="button">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
