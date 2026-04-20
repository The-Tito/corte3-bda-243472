'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'veterinario' | 'recepcion' | 'administrador'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('veterinario')
  const [vetId, setVetId] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already logged in, skip login
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/mascotas')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = { role }
      if (role === 'veterinario') {
        body.vet_id = vetId
      }

      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? data.message ?? 'Error al iniciar sesion')
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('role', role)
      if (role === 'veterinario') {
        localStorage.setItem('vet_id', String(vetId))
      } else {
        localStorage.removeItem('vet_id')
      }

      router.push('/mascotas')
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend este corriendo en puerto 3001.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        margin: '-2rem',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
            Clinica Veterinaria
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Sistema de Gestion Interno
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Role selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="role"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}
            >
              Rol de acceso
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: '1.5px solid #d1d5db',
                fontSize: '0.95rem',
                color: '#1e293b',
                background: '#f9fafb',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="veterinario">Veterinario</option>
              <option value="recepcion">Recepcion</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>

          {/* Vet ID — only for veterinario */}
          {role === 'veterinario' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="vetId"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}
              >
                ID del Veterinario
              </label>
              <input
                id="vetId"
                type="number"
                min={1}
                max={3}
                value={vetId}
                onChange={(e) => setVetId(Number(e.target.value))}
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
                }}
              />
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                1: Dr. Lopez &nbsp;|&nbsp; 2: Dra. Garcia &nbsp;|&nbsp; 3: Dr. Mendez
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#94a3b8' : '#1e40af',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
