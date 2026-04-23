'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface InventarioItem {
  id: number
  nombre: string
  stock_actual: number
  stock_minimo: number
  costo_unitario?: number | string
}

export default function InventarioPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [items, setItems] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const r = localStorage.getItem('role')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setRole(r)
    fetchInventario(t)
  }, [router])

  async function fetchInventario(currentToken: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3001/api/inventario', {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail ?? data.error ?? 'Error al cargar inventario')
        return
      }

      setItems(data.items ?? [])
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
        Inventario de Vacunas
      </h1>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '1.5rem' }}>💡</span>
        <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
          <strong>Control de Stock:</strong> Los elementos resaltados en rojo indican que el stock está por debajo del mínimo configurado.
          {role === 'veterinario' && <p style={{ margin: '0.25rem 0 0' }}>Nota: Como <strong>Veterinario</strong>, los precios están ocultos por política de permisos de columna (GRANT SELECT limitado).</p>}
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Nombre', 'Stock Actual', 'Stock Mínimo', role === 'administrador' ? 'Costo Unitario' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLowStock = item.stock_minimo !== undefined && item.stock_actual < item.stock_minimo
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: isLowStock ? '#fff1f2' : 'transparent' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.95rem', fontWeight: 600, color: isLowStock ? '#991b1b' : '#1e293b' }}>
                    {item.nombre}
                    {isLowStock && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Bajo Stock</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: isLowStock ? '#dc2626' : '#374151', fontWeight: isLowStock ? 700 : 400 }}>{item.stock_actual}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#64748b' }}>{item.stock_minimo}</td>
                  {role === 'administrador' && (
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>
                      ${typeof item.costo_unitario === 'number' ? item.costo_unitario.toFixed(2) : item.costo_unitario}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {items.length === 0 && !loading && <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No se encontraron datos de inventario.</div>}
      </div>
    </div>
  )
}
