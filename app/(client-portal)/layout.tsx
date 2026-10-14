// path: app/(client-portal)/layout.tsx
import type { ReactElement, ReactNode } from 'react';

interface ClientPortalLayoutProps {
  readonly children: ReactNode;
}

export default function ClientPortalLayout({ children }: ClientPortalLayoutProps): ReactElement {
  return (
    <main
      id="main-content"
      className="application-shell application-shell-client-portal"
      data-shell="client-portal"
    >
      {children}
    </main>
  );
}
