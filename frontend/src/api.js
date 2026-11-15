// API client. Talks to the ASP.NET backend through the Vite proxy (/api -> :5198).
// If the backend is unreachable, falls back to an in-memory demo store so the UI stays usable.

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export const RESOURCES = {
  pacientes: { path: 'Pacientes', id: 'idPaciente' },
  doctores: { path: 'Doctores', id: 'idDoctor' },
  especialidades: { path: 'Especialidades', id: 'idEspecialidad' },
  citas: { path: 'Citas', id: 'idCita' },
  consultas: { path: 'Consultas', id: 'idConsulta' },
}

let demoMode = false
const listeners = new Set()
export const isDemo = () => demoMode
export const onModeChange = (fn) => (listeners.add(fn), () => listeners.delete(fn))
const setDemo = (v) => {
  if (demoMode !== v) {
    demoMode = v
    listeners.forEach((fn) => fn(v))
  }
}

// ---------- demo data ----------
const today = new Date()
const day = (offset) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10) + 'T00:00:00'
}
const demo = {
  especialidades: [
    { idEspecialidad: 1, nombre: 'Cardiología' },
    { idEspecialidad: 2, nombre: 'Pediatría' },
    { idEspecialidad: 3, nombre: 'Neurología' },
    { idEspecialidad: 4, nombre: 'Medicina Interna' },
  ],
  doctores: [
    { idDoctor: 1, nombre: 'Carlos', apellido: 'Rodríguez', idEspecialidad: 1 },
    { idDoctor: 2, nombre: 'María', apellido: 'Santos', idEspecialidad: 2 },
    { idDoctor: 3, nombre: 'Elena', apellido: 'Vázquez', idEspecialidad: 3 },
    { idDoctor: 4, nombre: 'Javier', apellido: 'Morales', idEspecialidad: 4 },
  ],
  pacientes: [
    { idPaciente: 1, nombre: 'Luis', apellido: 'Pérez', fechaNacimiento: '1986-03-14T00:00:00', telefono: '7875551234', email: 'luis@email.com' },
    { idPaciente: 2, nombre: 'Ana', apellido: 'López', fechaNacimiento: '1992-11-02T00:00:00', telefono: '7874442222', email: 'ana@email.com' },
    { idPaciente: 3, nombre: 'Sofía', apellido: 'Rivera', fechaNacimiento: '2015-06-21T00:00:00', telefono: '7873339876', email: 'sofia.r@email.com' },
    { idPaciente: 4, nombre: 'Miguel', apellido: 'Torres', fechaNacimiento: '1958-01-30T00:00:00', telefono: '7872227788', email: 'mtorres@email.com' },
    { idPaciente: 5, nombre: 'Gabriela', apellido: 'Ortiz', fechaNacimiento: '1979-09-09T00:00:00', telefono: '7871114455', email: 'gortiz@email.com' },
  ],
  citas: [
    { idCita: 1, idPaciente: 1, idDoctor: 1, fecha: day(-6), hora: '10:00:00', motivo: 'Chequeo general' },
    { idCita: 2, idPaciente: 2, idDoctor: 2, fecha: day(-3), hora: '11:30:00', motivo: 'Consulta pediátrica' },
    { idCita: 3, idPaciente: 4, idDoctor: 1, fecha: day(0), hora: '08:30:00', motivo: 'Dolor torácico leve' },
    { idCita: 4, idPaciente: 3, idDoctor: 2, fecha: day(0), hora: '13:15:00', motivo: 'Vacunación' },
    { idCita: 5, idPaciente: 5, idDoctor: 3, fecha: day(1), hora: '09:45:00', motivo: 'Migrañas recurrentes' },
    { idCita: 6, idPaciente: 1, idDoctor: 4, fecha: day(3), hora: '15:00:00', motivo: 'Seguimiento de laboratorio' },
  ],
  consultas: [
    { idConsulta: 1, idCita: 1, diagnostico: 'Paciente saludable', observaciones: 'Repetir chequeo en 12 meses' },
    { idConsulta: 2, idCita: 2, diagnostico: 'Infección respiratoria leve', observaciones: 'Reposo e hidratación' },
  ],
}

async function demoCall(key, method, id, body) {
  const { id: idField } = RESOURCES[key]
  const list = demo[key]
  await new Promise((r) => setTimeout(r, 120))
  if (method === 'GET') return structuredClone(list)
  if (method === 'POST') {
    const item = { ...body, [idField]: Math.max(0, ...list.map((x) => x[idField])) + 1 }
    list.push(item)
    return item
  }
  const idx = list.findIndex((x) => x[idField] === id)
  if (method === 'PUT' && idx >= 0) list[idx] = { ...body }
  if (method === 'DELETE' && idx >= 0) list.splice(idx, 1)
  return null
}

async function request(key, method = 'GET', id, body) {
  if (demoMode) return demoCall(key, method, id, body)
  const url = `${BASE}/${RESOURCES[key].path}${id != null ? `/${id}` : ''}`
  let res
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // Network failure. Only reads may fall back to demo data; a write must never report fake success.
    if (method !== 'GET') throw new Error('No se pudo conectar con el servidor. Inténtelo de nuevo.')
    setDemo(true)
    return demoCall(key, method, id, body)
  }
  // The Vite proxy answers 5xx with an EMPTY body when the backend is not running.
  // A real server error (ASP.NET exception page / problem+json) has a body and is surfaced as an error.
  if (res.status >= 500) {
    const text = await res.text().catch(() => '')
    if (!text.trim() && method === 'GET') {
      setDemo(true)
      return demoCall(key, method, id, body)
    }
    let msg = `Error del servidor (${res.status})`
    try {
      const data = JSON.parse(text)
      msg = data.title || data.detail || data.message || msg
    } catch { /* non-JSON body */ }
    throw new Error(msg)
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const data = await res.json()
      msg = data.title || data.message || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.status === 204 ? null : res.json().catch(() => null)
}

export const api = {
  list: (key) => request(key),
  create: (key, body) => request(key, 'POST', null, body),
  update: (key, id, body) => request(key, 'PUT', id, body),
  remove: (key, id) => request(key, 'DELETE', id),
}

// ---------- formatting helpers ----------
export const fullName = (p) => (p ? `${p.nombre} ${p.apellido}` : '—')
export const initials = (p) => (p ? `${p.nombre?.[0] ?? ''}${p.apellido?.[0] ?? ''}`.toUpperCase() : '?')
export const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '')
export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return '—'
  const [y, m, d] = dateOnly(iso).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-PR', opts)
}
export const fmtTime = (hms) => {
  if (!hms) return '—'
  const [h, m] = hms.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-PR', { hour: 'numeric', minute: '2-digit' })
}
export const fmtPhone = (t) => (t && /^\d{10}$/.test(t) ? `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}` : t || '—')
export const age = (iso) => {
  if (!iso) return null
  const [y, m, d] = dateOnly(iso).split('-').map(Number)
  const b = new Date(y, m - 1, d) // local date — avoids UTC off-by-one
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--
  return a
}
export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
