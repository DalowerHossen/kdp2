// path: app/(admin)/layout.tsx
import { ShellFrame } from '@/components/layout/shell-frame';
import { en } from '@/lib/i18n/strings/en';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ShellFrame eyebrow={en.shell.platformLabel} title={en.nav.admin}>
      {children}
    </ShellFrame>
  );
}
