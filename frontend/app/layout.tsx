import type { Metadata } from 'next'
import NavHeader from './components/NavHeader'

export const metadata: Metadata = {
  title: 'Clinica Veterinaria',
  description: 'Sistema de gestion de clinica veterinaria',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: '#f1f5f9',
          minHeight: '100vh',
        }}
      >
        <NavHeader />
        <main style={{ padding: '2rem' }}>{children}</main>
      </body>
    </html>
  )
}
