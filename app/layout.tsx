import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRE Lease Assistant',
  description: 'Commercial Real Estate Lease Management and Q&A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
