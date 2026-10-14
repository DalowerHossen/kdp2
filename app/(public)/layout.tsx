// path: app/(public)/layout.tsx
import Link from 'next/link';
import { en } from '@/lib/i18n/strings/en';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {en.app.name}
          </Link>
          <nav aria-label="Primary">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {en.nav.signIn}
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>{en.app.name}</span>
        </div>
      </footer>
    </div>
  );
}
