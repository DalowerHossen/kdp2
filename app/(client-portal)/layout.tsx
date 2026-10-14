// path: app/(client-portal)/layout.tsx
import { en } from '@/lib/i18n/strings/en';

export default function ClientPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <span className="text-sm font-semibold">{en.app.name}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}
