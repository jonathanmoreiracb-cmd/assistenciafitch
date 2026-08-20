import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Fitch Tecnologia | Sistema de Gestão de Assistência Técnica',
  description: 'Gestão especializada em manutenção de iPhones, iPads, Apple Watch, Macs e dispositivos Android.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-[#f5f5f7] text-[#1d1d1f] selection:bg-[#0071e3] selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8">
          {children}
        </main>
        <footer className="no-print border-t border-slate-200/80 bg-white py-6 pb-20 md:pb-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Fitch Tecnologia • Assistência Técnica Especializada Apple & Android.</p>
        </footer>
      </body>
    </html>
  );
}
