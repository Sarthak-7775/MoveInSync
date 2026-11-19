import type { Metadata } from 'next';
import './globals.css';
import { TicketsProvider } from '@/context/TicketsContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'RideOps Gatekeeper | L1 Support Triage & Escalation Workbench',
  description:
    'Internal L1 support triage workbench, pre-escalation gatekeeper, and weekly ops scorecard for RideOps.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <TicketsProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </TicketsProvider>
      </body>
    </html>
  );
}
