'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CitaForm {
  mascota_id: string
  veterinario_id: string
  fecha_hora: string
  motivo: string
}

export default function NuevaCitaPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [form, setForm] = useState<CitaForm>({
    mascota_id: '',
    veterinario_id: '',
    fecha_hora: '',
    motivo: '',
  })
  const [loading, setLoading] = useState(false)
  const [successId, setSuccessId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
  }, [router])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setSuccessId(null)
    setLoading(true)

    try {
      const body = {
        mascota_id: Number(form.mascota_id),
        veterinario_id: Number(form.veterinario_id),
        fecha_hora: form.fecha_hora,
        motivo: form.motivo,
      }

      const res = await fetch('http://localhost:3001/api/citas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        // Prefer the DB-level detail (e.g. "El veterinario descansa los lunes") over the generic error
        setError(data.detail ?? data.error ?? data.message ?? `Error ${res.status}`)
        return
      }

      setSuccessId(data.id ?? data.cita_id ?? data.data?.id ?? null)
      // Reset form
      setForm({ mascota_id: '', veterinario_id: '', fecha_hora: '', motivo: '' })
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1.5px solid #d1d5db',
    fontSize: '0.95rem',
    color: '#1e293b',
    background: '#f9fafb',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.4rem',
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.75rem', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
        Agendar Nueva Cita
      </h1>

      {/* Success message */}
      {successId !== null && (
        <div
          style={{
            background: '#dcfce7',
            border: '1.5px solid #4ade80',
            color: '#166534',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          Cita creada con ID: <strong>{successId}</strong>
        </div>
      )}
      {successId === null && (
        /* Show a generic success without ID when API doesn't return id */
        null
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            color: '#991b1b',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div>
          <label htmlFor="mascota_id" style={labelStyle}>
            Mascota ID
          </label>
          <input
            id="mascota_id"
            name="mascota_id"
            type="number"
            min={1}
            required
            value={form.mascota_id}
            onChange={handleChange}
            placeholder="Ej: 1"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="veterinario_id" style={labelStyle}>
            Veterinario ID
          </label>
          <input
            id="veterinario_id"
            name="veterinario_id"
            type="number"
            min={1}
            required
            value={form.veterinario_id}
            onChange={handleChange}
            placeholder="1: Dr. Lopez | 2: Dra. Garcia | 3: Dr. Mendez"
            style={inputStyle}
          />
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
            1: Dr. Lopez &nbsp;|&nbsp; 2: Dra. Garcia &nbsp;|&nbsp; 3: Dr. Mendez
          </p>
        </div>

        <div>
          <label htmlFor="fecha_hora" style={labelStyle}>
            Fecha y Hora
          </label>
          <input
            id="fecha_hora"
            name="fecha_hora"
            type="datetime-local"
            required
            value={form.fecha_hora}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="motivo" style={labelStyle}>
            Motivo
          </label>
          <textarea
            id="motivo"
            name="motivo"
            required
            value={form.motivo}
            onChange={handleChange}
            placeholder="Describe el motivo de la consulta..."
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
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
          {loading ? 'Agendando...' : 'Agendar'}
        </button>
      </form>
    </div>
  )
}
