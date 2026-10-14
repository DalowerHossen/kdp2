// path: app/loading.tsx
import { Loader2 } from 'lucide-react';
import { en } from '@/lib/i18n/strings/en';

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center gap-3 text-muted-foreground"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{en.states.loading}</span>
    </div>
  );
}
