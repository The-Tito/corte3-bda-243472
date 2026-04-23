'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Mascota {
  id: number
  nombre: string
  especie: string
  dueno_id: number
  dueno_nombre: string
  dueno_telefono: string
}

const ROLE_COLORS: Record<string, string> = {
  veterinario: '#1d6f42',
  recepcion: '#1a4a8a',
  administrador: '#7a1a1a',
}

const ROLE_LABELS: Record<string, string> = {
  veterinario: 'Veterinario',
  recepcion: 'Recepcion',
  administrador: 'Administrador',
}

export default function MascotasPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const r = localStorage.getItem('role')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setRole(r)
  }, [router])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setLoading(true)
    setSearched(true)

    try {
      const url = `http://localhost:3001/api/mascotas${search ? `?nombre=${encodeURIComponent(search)}` : ''}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setError(data.detail ?? 'Tu rol no tiene permisos para acceder a esta sección.')
        } else {
          setError(data.error ?? data.message ?? `Error ${res.status}`)
        }
        setMascotas([])
        return
      }

      setMascotas(Array.isArray(data) ? data : data.mascotas ?? data.data ?? [])
    } catch {
      setError('No se pudo conectar con el servidor.')
      setMascotas([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
          Busqueda de Mascotas
        </h1>
        {role && (
          <span
            style={{
              background: ROLE_COLORS[role] ?? '#555',
              color: '#fff',
              borderRadius: '999px',
              padding: '4px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {ROLE_LABELS[role] ?? role}
          </span>
        )}
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label
            htmlFor="nombre"
            style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}
          >
            Nombre de la mascota
          </label>
          <input
            id="nombre"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre de mascota (prueba: ' OR '1'='1)"
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid #d1d5db',
              fontSize: '0.95rem',
              color: '#1e293b',
              background: '#f9fafb',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.6rem 1.5rem',
            background: loading ? '#94a3b8' : '#1e40af',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && !error && (
        <div
          style={{
            background: '#fff',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            overflow: 'hidden',
          }}
        >
          {mascotas.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '1rem',
              }}
            >
              Sin resultados
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['ID', 'Nombre', 'Especie', 'Dueño', 'Teléfono'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.9rem 1rem',
                        textAlign: 'left',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mascotas.map((m, idx) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151', fontWeight: 600 }}>
                      {m.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>
                      {m.nombre}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' }}>
                      {m.especie}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' }}>
                      {m.dueno_nombre}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' }}>
                      {m.dueno_telefono}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* RLS note */}
      <p
        style={{
          marginTop: '1.25rem',
          fontSize: '0.82rem',
          color: '#64748b',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.6rem 1rem',
        }}
      >
        <strong>RLS activo:</strong> solo ves las mascotas asignadas a tu rol
      </p>
    </div>
  )
}
