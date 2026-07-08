import type { Metadata } from 'next'
import { DM_Sans, Questrial } from 'next/font/google'
import './globals.css'
import Footer from '@/components/Footer'
import { branding } from '@/lib/branding'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
})

const questrial = Questrial({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-questrial',
})

export const metadata: Metadata = {
  title: branding.siteTitle,
  description: branding.siteDescription,
  // Favicon served as a plain static asset from /public (NOT an app/icon.* file,
  // which regenerates the CF _routes.json and can 404 dynamic routes).
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${questrial.variable} h-full`}>
      <body className="min-h-full">
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  )
}
