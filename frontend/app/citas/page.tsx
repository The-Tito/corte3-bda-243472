'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Cita {
  id: number
  mascota_nombre: string
  veterinario_nombre: string
  fecha_hora: string
  motivo: string
  estado: string
}

export default function CitasPage() {
  const router = useRouter()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }

    fetch('http://localhost:3001/api/citas', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar las citas')
        return res.json()
      })
      .then((data) => {
        setCitas(data.citas || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>Panel de Citas</h1>

      {error && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '8px' }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <p>Cargando citas...</p>
      ) : citas.length === 0 ? (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
          No hay citas programadas para mostrar.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {citas.map((cita) => (
            <div
              key={cita.id}
              style={{
                background: '#fff',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{cita.mascota_nombre}</strong>
                <span style={{ fontSize: '0.85rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                  {cita.estado}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.25rem' }}>
                📅 {new Date(cita.fecha_hora).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.25rem' }}>
                👨‍⚕️ {cita.veterinario_nombre}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#334155', marginTop: '0.75rem' }}>
                <em>&quot;{cita.motivo}&quot;</em>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
