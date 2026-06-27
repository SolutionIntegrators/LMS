import type { Metadata } from 'next'
import { DM_Sans, Questrial } from 'next/font/google'
import './globals.css'

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
  title: 'Solution Integrators Portal',
  description: 'Your learning portal for Solution Integrators programs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${questrial.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
