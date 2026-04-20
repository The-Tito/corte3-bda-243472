'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface VacunacionRow {
  mascota_nombre: string
  especie: string
  dueno_nombre: string
  dueno_telefono: string
  estado_vacunacion: string
}

interface VacunacionResponse {
  cache_hit: boolean
  mascotas: VacunacionRow[]
}

export default function VacunacionPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [rows, setRows] = useState<VacunacionRow[]>([])
  const [cacheHit, setCacheHit] = useState<boolean | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
  }, [router])

  const fetchData = useCallback(
    async (currentToken: string) => {
      setLoading(true)
      setError(null)
      setForbidden(false)

      const start = performance.now()
      try {
        const res = await fetch('http://localhost:3001/api/vacunacion-pendiente', {
          headers: { Authorization: `Bearer ${currentToken}` },
          // Prevent browser caching so we always measure backend latency
          cache: 'no-store',
        })
        const end = performance.now()
        setLatency(Math.round(end - start))

        const data = await res.json()

        if (!res.ok) {
          if (res.status === 403) {
            setForbidden(true)
          } else {
            setError(data.error ?? data.message ?? `Error ${res.status}`)
          }
          setRows([])
          return
        }

        const typed = data as VacunacionResponse
        setCacheHit(typed.cache_hit)
        setRows(Array.isArray(typed.mascotas) ? typed.mascotas : [])
        setHasFetched(true)
      } catch {
        const end = performance.now()
        setLatency(Math.round(end - start))
        setError('No se pudo conectar con el servidor.')
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Auto-fetch on mount once token is ready
  useEffect(() => {
    if (token) {
      fetchData(token)
    }
  }, [token, fetchData])

  function handleReload() {
    if (token) fetchData(token)
  }

  const cacheBannerStyle: React.CSSProperties =
    cacheHit === null
      ? {}
      : cacheHit
      ? {
          background: '#dcfce7',
          border: '1.5px solid #4ade80',
          color: '#15803d',
        }
      : {
          background: '#fefce8',
          border: '1.5px solid #facc15',
          color: '#92400e',
        }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Title row */}
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
          Vacunacion Pendiente
        </h1>
        <button
          onClick={handleReload}
          disabled={loading}
          style={{
            padding: '0.55rem 1.4rem',
            background: loading ? '#94a3b8' : '#0f766e',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Cargando...' : 'Recargar'}
        </button>
      </div>

      {/* Cache banner */}
      {hasFetched && cacheHit !== null && (
        <div
          style={{
            ...cacheBannerStyle,
            borderRadius: '10px',
            padding: '0.9rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{cacheHit ? '✅' : '⚠️'}</span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.02em' }}>
              CACHE {cacheHit ? 'HIT' : 'MISS'}
            </span>
            <span style={{ fontSize: '0.88rem', opacity: 0.85 }}>
              — {cacheHit ? 'Datos servidos desde Redis' : 'Datos consultados desde la base de datos'}
            </span>
          </div>
          {latency !== null && (
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.92rem',
                background: 'rgba(0,0,0,0.08)',
                borderRadius: '999px',
                padding: '3px 12px',
              }}
            >
              {latency} ms
            </span>
          )}
        </div>
      )}

      {/* Loading state — shown only on first load (no data yet) */}
      {loading && !hasFetched && (
        <div
          style={{
            background: '#fff',
            borderRadius: '10px',
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          }}
        >
          Cargando...
        </div>
      )}

      {/* Access denied panel — shown when role lacks permission */}
      {forbidden && (
        <div
          style={{
            background: '#fff7ed',
            border: '2px solid #fb923c',
            borderRadius: '12px',
            padding: '2rem 2rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700, color: '#9a3412' }}>
            Acceso Denegado
          </h2>
          <p style={{ margin: '0 0 0.5rem', color: '#7c3b00', fontSize: '0.95rem' }}>
            El rol <strong>Recepción</strong> no tiene permisos para consultar vacunación pendiente.
          </p>
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.85rem' }}>
            Solo los roles <strong>Veterinario</strong> y <strong>Administrador</strong> pueden acceder a esta sección.
            Esto es un control de permisos a nivel de base de datos (PostgreSQL RLS + GRANT).
          </p>
        </div>
      )}

      {/* Generic error */}
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

      {/* Table */}
      {hasFetched && !error && !forbidden && (
        <div
          style={{
            background: '#fff',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            overflow: 'hidden',
          }}
        >
          {rows.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              Sin mascotas con vacunacion pendiente
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Mascota', 'Especie', 'Dueno', 'Telefono', 'Estado Vacunacion'].map((h) => (
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
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                      {row.mascota_nombre}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' }}>
                      {row.especie}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' }}>
                      {row.dueno_nombre}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#374151' }}>
                      {row.dueno_telefono}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                      <span
                        style={{
                          background:
                            row.estado_vacunacion?.toLowerCase() === 'al dia'
                              ? '#dcfce7'
                              : row.estado_vacunacion?.toLowerCase() === 'pendiente'
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            row.estado_vacunacion?.toLowerCase() === 'al dia'
                              ? '#166534'
                              : row.estado_vacunacion?.toLowerCase() === 'pendiente'
                              ? '#92400e'
                              : '#991b1b',
                          borderRadius: '999px',
                          padding: '3px 12px',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        {row.estado_vacunacion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
