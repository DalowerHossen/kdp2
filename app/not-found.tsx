// path: app/not-found.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';

export default function NotFound(): ReactElement {
  return (
    <main id="main-content" className="page-state">
      <p className="visually-hidden">Error 404</p>
      <h1>Page not found</h1>
      <p>The address may be out of date, or the page may have moved.</p>
      <div className="page-state-actions">
        <Link className="button button-primary" href="/">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
