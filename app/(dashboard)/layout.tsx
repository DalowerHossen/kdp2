// path: app/(dashboard)/layout.tsx
import { ShellFrame } from '@/components/layout/shell-frame';
import { en } from '@/lib/i18n/strings/en';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ShellFrame eyebrow={en.shell.workspaceLabel} title={en.nav.dashboard}>
      {children}
    </ShellFrame>
  );
}
