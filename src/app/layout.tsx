import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'The Little Lot — Find land for your tiny home',
    template: '%s | The Little Lot',
  },
  description:
    'Search lots for tiny homes, THOWs, and off-grid homesteads across the US. Plain-language zoning, readiness scores, and no lifestyle fluff.',
  openGraph: {
    title: 'The Little Lot',
    description: 'Find land where your home is welcome, legal, and buildable.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
