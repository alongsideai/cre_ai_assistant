import type { Metadata } from 'next';
import './globals.css';
import AppHeader from '@/components/layout/AppHeader';

export const metadata: Metadata = {
  title: 'MagnetAI',
  description: 'Commercial Real Estate Property Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen flex flex-col">
          <AppHeader />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
