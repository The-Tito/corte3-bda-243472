'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuditLog {
  id: number
  tipo: string
  referencia_id: number | null
  descripcion: string
  fecha: string
}

export default function AuditoriaPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!t) {
      router.replace('/login')
      return
    }
    if (role !== 'administrador') {
      setForbidden(true)
      return
    }
    setToken(t)
    fetchLogs(t)
  }, [router])

  async function fetchLogs(currentToken: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3001/api/auditoria', {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) setForbidden(true)
        else setError(data.error ?? data.message ?? 'Error al cargar logs')
        return
      }

      setLogs(data.logs ?? [])
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  if (forbidden) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ color: '#991b1b' }}>Acceso Restringido</h2>
        <p>Solo el rol <strong>Administrador</strong> tiene acceso a la bitácora de auditoría.</p>
        <button 
          onClick={() => router.push('/mascotas')}
          style={{ padding: '0.5rem 1rem', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Volver a Mascotas
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
          Bitácora de Auditoría (Triggers)
        </h1>
        <button 
          onClick={() => token && fetchLogs(token)} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #1e40af' }}>
        <strong>Nota Técnica:</strong> Estas entradas son generadas automáticamente por el trigger <code>trg_historial_cita</code> en PostgreSQL cada vez que se manipula la tabla <code>citas</code>.
      </p>

      {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Fecha', 'Tipo', 'Ref ID', 'Descripción'].map(h => (
                <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{new Date(log.fecha).toLocaleString()}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ 
                    background: log.tipo.includes('CANCEL') ? '#fee2e2' : '#dcfce7',
                    color: log.tipo.includes('CANCEL') ? '#991b1b' : '#166534',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700
                  }}>
                    {log.tipo}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{log.referencia_id}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{log.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && !loading && <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No hay registros en la bitácora.</div>}
      </div>
    </div>
  )
}
