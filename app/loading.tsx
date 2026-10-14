// path: app/loading.tsx
import type { ReactElement } from 'react';

export default function Loading(): ReactElement {
  return (
    <main id="main-content" className="page-state" aria-busy="true">
      <h1>Loading page content</h1>
      <p>Please wait while the page is prepared.</p>
      <div className="loading-indicator" aria-hidden="true">
        <div className="loading-bar" />
        <div className="loading-bar" />
        <div className="loading-bar" />
      </div>
      <span className="visually-hidden" role="status">
        Loading
      </span>
    </main>
  );
}
