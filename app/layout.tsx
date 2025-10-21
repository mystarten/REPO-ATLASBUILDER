import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ATLAS - Documentation N8N automatique',
  description: 'Générez automatiquement une documentation professionnelle pour vos workflows N8N',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.1,
  maximumScale: 2,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/images/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </head>
      <body className={`${inter.className} pt-14`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
