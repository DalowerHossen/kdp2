// path: app/(dashboard)/layout.tsx
import type { ReactElement, ReactNode } from 'react';

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  return (
    <main
      id="main-content"
      className="application-shell application-shell-dashboard"
      data-shell="dashboard"
    >
      {children}
    </main>
  );
}
