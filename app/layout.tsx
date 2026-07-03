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
