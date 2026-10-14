// path: app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { en } from '@/lib/i18n/strings/en';

export default function GlobalSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client segment errors surface to the user only; the server pipeline has
    // already logged the correlated server-side error.
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">{en.states.errorTitle}</h1>
      <p className="max-w-md text-muted-foreground">{en.states.errorBody}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {en.states.retry}
      </button>
    </main>
  );
}
