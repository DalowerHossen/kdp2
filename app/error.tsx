// path: app/error.tsx
'use client';

import type { ReactElement } from 'react';

interface RouteError {
  readonly digest?: string;
}

interface ErrorBoundaryProps {
  readonly error: Error & RouteError;
  readonly reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps): ReactElement {
  return (
    <main id="main-content" className="page-state" role="alert">
      <h1>This page could not load</h1>
      <p>A temporary issue interrupted this request. Try again, or return to the home page.</p>
      {error.digest === undefined ? null : <p>Reference: {error.digest}</p>}
      <div className="page-state-actions">
        <button className="button button-primary" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </main>
  );
}
