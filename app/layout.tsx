import type { Metadata, Viewport } from 'next';
import './globals.css';
import PortalShell from '@/components/PortalShell';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'DA-CAR | Rice Program Coordinating Unit',
  description:
    'Department of Agriculture – Cordillera Administrative Region | Rice Program Coordinating Unit. Supporting farmers, food security, and sustainable agriculture in the Cordilleras.',
  icons: {
    icon: '/da-logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}
