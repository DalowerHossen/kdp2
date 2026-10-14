// path: app/(public)/layout.tsx
import type { ReactElement, ReactNode } from 'react';

interface PublicLayoutProps {
  readonly children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps): ReactElement {
  return (
    <main
      id="main-content"
      className="application-shell application-shell-public"
      data-shell="public"
    >
      {children}
    </main>
  );
}
