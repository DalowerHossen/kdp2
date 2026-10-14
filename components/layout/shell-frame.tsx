// path: components/layout/shell-frame.tsx
import type { ReactNode } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { en } from '@/lib/i18n/strings/en';

/**
 * Minimal group shell for the (dashboard) and (admin) route groups while
 * STEP_01 builds the full design system. Real container: brand header, nav
 * landmark, content region, dark-mode ready, keyboard accessible.
 */
export function ShellFrame({
  eyebrow,
  title,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  children?: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="flex h-14 items-center gap-3 px-4">
          <LayoutDashboard className="h-5 w-5 text-primary" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</span>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <span className="ml-auto text-sm font-medium">{en.app.name}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}

export function FoundationNotice() {
  return (
    <section
      aria-label="Foundation notice"
      className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center"
    >
      <h1 className="text-xl font-semibold">{en.shell.foundationNotice.split('.')[0]}.</h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {en.shell.foundationNotice}
      </p>
    </section>
  );
}
