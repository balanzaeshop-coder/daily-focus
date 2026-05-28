import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import ServiceWorkerRegistrar from './ServiceWorkerRegistrar'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Daily Focus',
  description: '3 priority. Každý deň. Bez výhovoriek.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Daily Focus',
  },
  icons: {
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen">
        <Providers>
          <ServiceWorkerRegistrar />
          <main className="pb-20 min-h-screen">
            {children}
          </main>
          <Navigation />
        </Providers>
      </body>
    </html>
  )
}
