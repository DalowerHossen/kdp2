// path: app/not-found.tsx
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { en } from '@/lib/i18n/strings/en';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">{en.states.notFoundTitle}</h1>
      <p className="max-w-md text-muted-foreground">{en.states.notFoundBody}</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {en.states.backHome}
      </Link>
    </main>
  );
}
