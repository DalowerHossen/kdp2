// path: app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import type { ReactElement, ReactNode } from 'react';
import './globals.css';

const THEME_BOOTSTRAP = `(()=>{try{const t=localStorage.getItem('kd-theme');const v=t==='light'||t==='dark'||t==='high-contrast'?t:'system';document.documentElement.dataset.theme=v;}catch{document.documentElement.dataset.theme='system';}})();`;

export const metadata: Metadata = {
  applicationName: 'KD Solution IT',
  description: 'A secure workspace for business operations.',
  title: {
    default: 'KD Solution IT',
    template: '%s | KD Solution IT',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  initialScale: 1,
  themeColor: [
    { color: '#FFFFFF', media: '(prefers-color-scheme: light)' },
    { color: '#0B1220', media: '(prefers-color-scheme: dark)' },
  ],
  width: 'device-width',
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps): Promise<ReactElement> {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  return (
    <html lang="en" data-theme="system" suppressHydrationWarning>
      <body className="app-document">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Script id="theme-bootstrap" nonce={nonce} strategy="beforeInteractive">
          {THEME_BOOTSTRAP}
        </Script>
        {children}
      </body>
    </html>
  );
}
