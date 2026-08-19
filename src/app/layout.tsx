import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Linux evaluation '26",
  description: 'Live Linux evaluation leaderboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}