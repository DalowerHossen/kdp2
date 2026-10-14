// path: app/(admin)/layout.tsx
import type { ReactElement, ReactNode } from 'react';

interface AdminLayoutProps {
  readonly children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps): ReactElement {
  return (
    <main
      id="main-content"
      className="application-shell application-shell-admin"
      data-shell="admin"
    >
      {children}
    </main>
  );
}
