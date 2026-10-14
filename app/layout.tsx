// path: app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { en } from '@/lib/i18n/strings/en';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: en.app.name,
    template: `%s | ${en.app.name}`,
  },
  description: en.app.tagline,
  applicationName: en.app.name,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

/**
 * No-flash theme bootstrap. Reads the stored theme choice and applies `dark`
 * before first paint. Inline by necessity; authorized via the CSP nonce.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('kd-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = headers().get('x-csp-nonce') ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
