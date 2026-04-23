'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  recepcion: 'Recepción',
  administrador: 'Administrador',
}

const ROLE_COLORS: Record<string, string> = {
  veterinario: '#1d6f42',
  recepcion: '#1a4a8a',
  administrador: '#7a1a1a',
}

export default function NavHeader() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [vetId, setVetId] = useState<string | null>(null)

  useEffect(() => {
    setRole(localStorage.getItem('role'))
    setVetId(localStorage.getItem('vet_id'))
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('vet_id')
    router.push('/login')
  }

  const roleColor = role ? (ROLE_COLORS[role] ?? '#555') : '#555'

  const linkStyle: React.CSSProperties = {
    color: '#93c5fd',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: '6px',
    transition: 'background 0.15s, color 0.15s',
  }

  return (
    <header
      style={{
        background: '#1e293b',
        color: '#fff',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '60px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          🐾 Clínica Vet
        </span>
        <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a href="/mascotas" style={linkStyle}>Mascotas</a>
          <a href="/vacunacion" style={linkStyle}>Vacunación</a>
          <a href="/citas/nueva" style={linkStyle}>Nueva Cita</a>

          {/* Inventario: visible for veterinario and administrador */}
          {(role === 'veterinario' || role === 'administrador') && (
            <a href="/inventario" style={linkStyle}>Inventario</a>
          )}

          {/* Auditoría: visible only for administrador */}
          {role === 'administrador' && (
            <a
              href="/admin/auditoria"
              style={{ ...linkStyle, color: '#fca5a5' }}
            >
              Auditoría
            </a>
          )}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {role && (
          <span
            style={{
              background: roleColor,
              color: '#fff',
              borderRadius: '999px',
              padding: '3px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {ROLE_LABELS[role] ?? role}
            {role === 'veterinario' && vetId ? ` #${vetId}` : ''}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  )
}
