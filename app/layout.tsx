import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BNDR — Intelligent Workspace',
  description: 'Research, code, draft, and collaborate with frontier AI models.',
  keywords: ['AI', 'workspace', 'collaboration', 'coding', 'writing'],
  openGraph: {
    title: 'BNDR — Intelligent Workspace',
    description: 'Premium AI workspace for teams.',
    type: 'website',
    siteName: 'BNDR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BNDR — Intelligent Workspace',
    description: 'Premium AI workspace for teams.',
  },
  robots: { index: true, follow: true },
  themeColor: '#0B0B0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-[#0B0B0D] text-[#EDEDEF] font-sans">
        {children}
      </body>
    </html>
  );
}
