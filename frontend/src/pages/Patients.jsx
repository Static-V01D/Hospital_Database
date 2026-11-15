// Pacientes — directorio de pacientes con búsqueda, filtro rápido, ficha con historial de citas,
// alta de pacientes y eliminación. El backend no admite edición (no hay PUT), por eso no hay botón de editar.
// Estado de cita: Atendida (tiene consulta) · Sin registrar (pasada sin consulta) · Hoy · Programada.
import { useCallback, useMemo, useRef, useState } from 'react'
import { api, dateOnly, fmtDate, fmtPhone, fmtTime, fullName, age, todayISO } from '../api.js'
import {
  useData, byId, useToast, Button, IconButton, Badge, Avatar, PageHeader, Card,
  SearchInput, Segmented, EmptyState, ErrorState, Field, DataTable, Modal, FormModal, ConfirmDialog,
} from '../components/ui.jsx'

const RESOURCE_KEYS = ['pacientes', 'citas', 'doctores', 'consultas']

const FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'proxima', label: 'Próxima cita' },
  { value: 'sin', label: 'Sin citas' },
]

const EMPTY_FORM = { nombre: '', apellido: '', fechaNacimiento: '', telefono: '', email: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Nombre del paciente como botón (abre la ficha con teclado); se ve igual que el texto .cell-main de Person.
const NAME_BTN = { display: 'block', maxWidth: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }

// ---------- helpers ----------
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const digitsOf = (s) => String(s ?? '').replace(/\D/g, '')
const citaKey = (c) => `${dateOnly(c.fecha)}T${c.hora ?? ''}`

// Teléfono normalizado a 10 dígitos (acepta un "1" inicial de larga distancia).
const phone10 = (s) => {
  const d = digitsOf(s)
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d
}
const showPhone = (t) => (phone10(t).length === 10 ? fmtPhone(phone10(t)) : fmtPhone(t))
const telHref = (t) => (phone10(t).length === 10 ? `tel:+1${phone10(t)}` : `tel:${digitsOf(t)}`)

const ageLabel = (iso) => {
  const a = age(iso)
  if (a == null) return null
  return a < 1 ? 'Menor de 1 año' : plural(a, 'año', 'años')
}

function citaStatus(cita, consulta, today) {
  if (consulta) return { label: 'Atendida', tone: 'green' }
  const d = dateOnly(cita.fecha)
  if (d < today) return { label: 'Sin registrar', tone: 'amber' }
  if (d === today) return { label: 'Hoy', tone: 'blue' }
  return { label: 'Programada', tone: 'brand' }
}

function validate(form, today) {
  const e = {}
  if (!form.nombre.trim()) e.nombre = 'Ingrese el nombre.'
  if (!form.apellido.trim()) e.apellido = 'Ingrese el apellido.'
  if (form.fechaNacimiento) {
    if (form.fechaNacimiento > today) e.fechaNacimiento = 'La fecha no puede ser futura.'
    else if (form.fechaNacimiento < '1900-01-01') e.fechaNacimiento = 'Revise el año de nacimiento.'
  }
  const tel = phone10(form.telefono)
  if (!tel) e.telefono = 'Ingrese un número de teléfono.'
  else if (tel.length !== 10) e.telefono = 'El teléfono debe tener 10 dígitos.'
  if (!form.email.trim()) e.email = 'Ingrese un correo electrónico.'
  else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Ingrese un correo válido (ej. nombre@correo.com).'
  return e
}

export default function Patients({ query, navigate }) {
  const toast = useToast()
  const { data, loading, error, reload } = useData(RESOURCE_KEYS)
  const today = todayISO()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [detailId, setDetailId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [creating, setCreating] = useState(() => query.get('nuevo') === '1')
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  // La página no se remonta cuando sólo cambia la query: reaccionar a ?nuevo=1 durante el render.
  const qs = query.toString()
  const [seenQs, setSeenQs] = useState(qs)
  if (qs !== seenQs) {
    setSeenQs(qs)
    if (query.get('nuevo') === '1') {
      setForm(EMPTY_FORM)
      setErrors({})
      setCreating(true)
    }
  }

  // ---------- derived data ----------
  const doctorById = useMemo(() => byId(data.doctores, 'idDoctor'), [data.doctores])
  const consultaByCita = useMemo(() => byId(data.consultas, 'idCita'), [data.consultas])

  // Por paciente: citas (más recientes primero), próxima cita pendiente y cuántas fueron atendidas.
  const stats = useMemo(() => {
    const out = {}
    for (const p of data.pacientes ?? []) out[p.idPaciente] = { citas: [], proxima: null, atendidas: 0 }
    for (const c of data.citas ?? []) out[c.idPaciente]?.citas.push(c)
    for (const s of Object.values(out)) {
      s.citas.sort((a, b) => citaKey(b).localeCompare(citaKey(a)))
      for (const c of s.citas) {
        if (consultaByCita[c.idCita]) s.atendidas++
        else if (dateOnly(c.fecha) >= today) s.proxima = c // recorrido descendente → queda la más cercana
      }
    }
    return out
  }, [data.pacientes, data.citas, consultaByCita, today])

  const pacientes = useMemo(
    () => [...(data.pacientes ?? [])].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es', { sensitivity: 'base' })),
    [data.pacientes],
  )
  const pacienteById = useMemo(() => byId(pacientes, 'idPaciente'), [pacientes])

  const visible = useMemo(() => {
    const raw = search.trim()
    const tokens = norm(raw).split(/\s+/).filter(Boolean)
    const digits = digitsOf(raw)
    return pacientes.filter((p) => {
      const s = stats[p.idPaciente]
      if (filter === 'proxima' && !s?.proxima) return false
      if (filter === 'sin' && s?.citas.length) return false
      if (!tokens.length) return true
      if (raw.startsWith('#') && String(p.idPaciente) === digits) return true
      const hay = norm(`${p.nombre} ${p.apellido} ${p.email ?? ''}`)
      if (tokens.every((t) => hay.includes(t))) return true
      return digits.length >= 3 && digitsOf(p.telefono).includes(digits)
    })
  }, [pacientes, stats, search, filter])

  const firstLoad = loading && !data.pacientes
  const total = pacientes.length
  const filtered = search.trim() !== '' || filter !== 'todos'
  const detail = detailId != null ? pacienteById[detailId] : null
  const deleting = deletingId != null ? pacienteById[deletingId] : null

  // ---------- actions ----------
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setCreating(true)
  }
  const closeCreate = useCallback(() => {
    setCreating(false)
    if (query.get('nuevo')) navigate('pacientes')
  }, [query, navigate])
  // Al cerrar la ficha abierta desde el botón del nombre, el foco vuelve a ese botón (no al inicio de la página).
  const detailTrigger = useRef(null)
  const openDetail = (p, trigger = null) => {
    detailTrigger.current = trigger
    setDetailId(p.idPaciente)
  }
  const closeDetail = useCallback(() => {
    setDetailId(null)
    detailTrigger.current?.focus()
    detailTrigger.current = null
  }, [])
  const closeDelete = useCallback(() => setDeletingId(null), [])

  const schedule = (p) => navigate('citas', { nueva: 1, paciente: p.idPaciente })
  const clearFilters = () => {
    setSearch('')
    setFilter('todos')
  }

  const setField = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const submitCreate = async () => {
    const errs = validate(form, today)
    setErrors(errs)
    if (Object.keys(errs).length) throw new Error('Revise los campos marcados antes de continuar.')
    const body = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      fechaNacimiento: form.fechaNacimiento || null,
      telefono: phone10(form.telefono),
      email: form.email.trim(),
    }
    await api.create('pacientes', body)
    toast(`Paciente registrado: ${body.nombre} ${body.apellido}`, 'success')
    closeCreate()
    reload()
  }

  const confirmDelete = async () => {
    const p = deleting
    if (!p) return
    try {
      await api.remove('pacientes', p.idPaciente)
      toast(`Se eliminó la ficha de ${fullName(p)}.`, 'success')
      reload()
    } catch (e) {
      // Atribuir el fallo a las citas sólo si el servidor lo rechazó como conflicto; si no, mostrar la causa real
      // (sin conexión, error 500…). `status` lo adjunta api.js cuando la respuesta lo trae.
      const n = stats[p.idPaciente]?.citas.length ?? 0
      const conflict = e?.status === 409 || e?.status === 400
      toast(
        conflict && n
          ? `No se pudo eliminar a ${fullName(p)}: tiene ${plural(n, 'cita registrada', 'citas registradas')}.`
          : `No se pudo eliminar el paciente. ${e?.message || ''}`.trim(),
        'error',
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ---------- table ----------
  const columns = [
    {
      key: 'paciente',
      header: 'Paciente',
      render: (p) => (
        // En el teléfono se oculta el avatar y el texto se limita a 25vw (recortado con "…") para que Próxima cita
        // y las acciones quepan sin desplazar la tabla; en escritorio 25vw supera los 260px y no recorta nada.
        <div className="person" style={{ maxWidth: 260 }}>
          <div className="hide-sm" style={{ flex: 'none' }}><Avatar person={p} /></div>
          <div style={{ maxWidth: '25vw' }}>
            <button
              type="button"
              className="cell-main"
              style={NAME_BTN}
              aria-label={`Ver ficha de ${fullName(p)}`}
              onClick={(e) => {
                e.stopPropagation()
                openDetail(p, e.currentTarget)
              }}
            >
              {fullName(p)}
            </button>
            <div className="cell-sub">{p.email || 'Sin correo registrado'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'edad',
      header: 'Edad',
      hideSm: true,
      render: (p) => {
        const label = ageLabel(p.fechaNacimiento)
        if (!label) return <span className="faint">—</span>
        return (
          <div style={{ whiteSpace: 'nowrap' }}>
            <div className="cell-main num">{label}</div>
            <div className="cell-sub num">{fmtDate(p.fechaNacimiento)}</div>
          </div>
        )
      },
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      hideSm: true, // en el teléfono el número sigue en la ficha; así las acciones caben sin desplazar la tabla
      className: 'num',
      render: (p) => <span style={{ whiteSpace: 'nowrap' }}>{showPhone(p.telefono)}</span>,
    },
    {
      key: 'citas',
      header: 'Citas',
      hideSm: true,
      className: 'num',
      render: (p) => {
        const s = stats[p.idPaciente]
        if (!s?.citas.length) return <span className="faint">0</span>
        return (
          <span className="cell-main" title={plural(s.atendidas, 'atendida', 'atendidas')}>{s.citas.length}</span>
        )
      },
    },
    {
      key: 'proxima',
      header: 'Próxima cita',
      render: (p) => {
        const c = stats[p.idPaciente]?.proxima
        // "Ninguna" (bajo el encabezado "Próxima cita") en vez de una frase larga que ensancha la columna en el teléfono.
        if (!c) return <span className="muted">Ninguna</span>
        const d = dateOnly(c.fecha)
        // Año sólo si no es el actual (como en el historial): columna más angosta, más espacio para el nombre.
        const label = d === today ? 'Hoy' : fmtDate(c.fecha, d.slice(0, 4) === today.slice(0, 4) ? { day: 'numeric', month: 'short' } : undefined)
        return (
          <div>
            <div className="cell-main" style={{ whiteSpace: 'nowrap' }}>{label}</div>
            <div className="cell-sub num" style={{ whiteSpace: 'nowrap' }}>{fmtTime(c.hora)}</div>
          </div>
        )
      },
    },
  ]

  const emptyState = filtered ? (
    <EmptyState
      icon="search"
      title="Sin resultados"
      text={
        search.trim()
          ? `No hay pacientes que coincidan con “${search.trim()}”${filter !== 'todos' ? ' en este filtro' : ''}. Pruebe con otro nombre, correo o número.`
          : filter === 'proxima'
            ? 'Ningún paciente tiene citas próximas en este momento.'
            : 'Todos los pacientes tienen al menos una cita en su historial.'
      }
      action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
    />
  ) : (
    <EmptyState
      icon="users"
      title="Aún no hay pacientes registrados"
      text="Registre al primer paciente para comenzar a agendar citas y llevar su historial clínico."
      action={<Button variant="primary" icon="plus" onClick={openCreate}>Registrar paciente</Button>}
    />
  )

  const countLabel = filtered ? `${visible.length} de ${plural(total, 'paciente', 'pacientes')}` : plural(total, 'paciente', 'pacientes')

  // ---------- detail ----------
  const detailStats = detail ? stats[detail.idPaciente] : null
  const deletingCitas = deleting ? stats[deleting.idPaciente]?.citas.length ?? 0 : 0

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle="Directorio de pacientes y su historial de citas."
        actions={<Button variant="primary" icon="plus" onClick={openCreate}>Registrar paciente</Button>}
      />

      <Card>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <div className="toolbar">
              {/* grid wrapper: lets the search take a full line on phones instead of collapsing next to the filter */}
              <div style={{ display: 'grid', flex: '1 1 240px', maxWidth: 380 }}>
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar nombre, correo o teléfono" />
              </div>
              <Segmented options={FILTERS} value={filter} onChange={setFilter} />
              <span className="spacer" />
              {firstLoad
                ? <div className="skeleton" style={{ width: 90 }} />
                : <span className="muted num" style={{ fontSize: 13 }}>{countLabel}</span>}
            </div>
            {/* relative + clip: keeps DataTable's absolutely-positioned sr-only header from widening the page on phones */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '0 0 var(--r-lg) var(--r-lg)' }}>
              <DataTable
                columns={columns}
                rows={visible}
                rowKey="idPaciente"
                loading={firstLoad}
                empty={emptyState}
                onRowClick={(p) => openDetail(p)}
                actions={(p) => (
                  <>
                    <IconButton icon="calendar" label="Agendar cita" onClick={() => schedule(p)} />
                    <IconButton icon="trash" label="Eliminar paciente" danger onClick={() => setDeletingId(p.idPaciente)} />
                  </>
                )}
                footer={<span>Seleccione un paciente para ver su ficha e historial de citas.</span>}
              />
            </div>
          </>
        )}
      </Card>

      {/* Ficha del paciente */}
      <Modal
        open={!!detail}
        onClose={closeDetail}
        title="Ficha del paciente"
        size="lg"
        footer={detail && (
          <>
            <Button
              variant="ghost"
              icon="trash"
              style={{ color: 'var(--red)', marginRight: 'auto' }}
              onClick={() => {
                setDeletingId(detail.idPaciente)
                setDetailId(null)
              }}
            >
              Eliminar
            </Button>
            <Button variant="primary" icon="calendar" onClick={() => schedule(detail)}>Agendar cita</Button>
          </>
        )}
      >
        {detail && detailStats && (
          <div className="stack" style={{ gap: 22 }}>
            <div className="row">
              <Avatar person={detail} size="lg" />
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: 18, lineHeight: 1.25 }}>{fullName(detail)}</h3>
                <div className="muted num">Paciente #{detail.idPaciente}</div>
              </div>
            </div>

            <dl className="dl">
              <dt>Fecha de nacimiento</dt>
              <dd>{detail.fechaNacimiento ? fmtDate(detail.fechaNacimiento, { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="muted">No registrada</span>}</dd>
              <dt>Edad</dt>
              <dd className="num">{ageLabel(detail.fechaNacimiento) ?? <span className="muted">—</span>}</dd>
              <dt>Teléfono</dt>
              <dd className="num">{detail.telefono ? <a href={telHref(detail.telefono)}>{showPhone(detail.telefono)}</a> : <span className="muted">No registrado</span>}</dd>
              <dt>Correo electrónico</dt>
              <dd style={{ overflowWrap: 'anywhere' }}>{detail.email ? <a href={`mailto:${detail.email}`}>{detail.email}</a> : <span className="muted">No registrado</span>}</dd>
              <dt>Próxima cita</dt>
              <dd>
                {detailStats.proxima
                  ? `${dateOnly(detailStats.proxima.fecha) === today ? 'Hoy' : fmtDate(detailStats.proxima.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} · ${fmtTime(detailStats.proxima.hora)}`
                  : <span className="muted">Sin citas próximas</span>}
              </dd>
            </dl>

            <section>
              <div className="row-between" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                <h3 className="card-title">Historial de citas</h3>
                {detailStats.citas.length > 0 && (
                  <span className="muted num" style={{ fontSize: 12.5 }}>
                    {plural(detailStats.citas.length, 'cita', 'citas')} · {plural(detailStats.atendidas, 'atendida', 'atendidas')}
                  </span>
                )}
              </div>
              <div className="card">
                {detailStats.citas.length ? (
                  <div className="list">
                    {detailStats.citas.map((c) => {
                      const consulta = consultaByCita[c.idCita]
                      const st = citaStatus(c, consulta, today)
                      const doctor = doctorById[c.idDoctor]
                      const year = dateOnly(c.fecha).slice(0, 4)
                      const sub = [
                        year !== today.slice(0, 4) && year,
                        fmtTime(c.hora),
                        doctor ? fullName(doctor) : 'Médico no asignado',
                      ].filter(Boolean).join(' · ')
                      return (
                        <div key={c.idCita} className="list-item" style={{ alignItems: 'flex-start' }}>
                          <div className="date-tile" aria-label={fmtDate(c.fecha)}>
                            <div className="m">{fmtDate(c.fecha, { month: 'short' }).replace('.', '')}</div>
                            <div className="dd">{Number(dateOnly(c.fecha).slice(8, 10))}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="row-between" style={{ flexWrap: 'wrap', gap: 6, alignItems: 'flex-start' }}>
                              <div className="cell-main">{c.motivo || 'Sin motivo especificado'}</div>
                              <Badge tone={st.tone} dot>{st.label}</Badge>
                            </div>
                            <div className="cell-sub num">{sub}</div>
                            {consulta && (
                              <div className="cell-sub" style={{ marginTop: 4 }}>
                                <span className="label">Diagnóstico:</span> {consulta.diagnostico || 'Sin diagnóstico registrado'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon="calendar"
                    title="Sin citas registradas"
                    text="Este paciente aún no tiene citas. Use “Agendar cita” para programar la primera."
                  />
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>

      {/* Registrar paciente — sin restricciones nativas (required, type="email", min/max): el navegador bloquearía
          el envío con su propio aviso y validate() no mostraría los mensajes en español junto a cada campo. */}
      <FormModal
        open={creating}
        onClose={closeCreate}
        title="Registrar paciente"
        subtitle="Los campos marcados con * son obligatorios."
        submitLabel="Registrar paciente"
        onSubmit={submitCreate}
      >
        <div className="form-row">
          <Field label="Nombre" required error={errors.nombre}>
            <input
              className={`input${errors.nombre ? ' invalid' : ''}`}
              value={form.nombre}
              onChange={setField('nombre')}
              placeholder="Ej. María"
              autoComplete="given-name"
              maxLength={50}
              aria-required="true"
              aria-invalid={!!errors.nombre}
            />
          </Field>
          <Field label="Apellido" required error={errors.apellido}>
            <input
              className={`input${errors.apellido ? ' invalid' : ''}`}
              value={form.apellido}
              onChange={setField('apellido')}
              placeholder="Ej. Rivera Ortiz"
              autoComplete="family-name"
              maxLength={50}
              aria-required="true"
              aria-invalid={!!errors.apellido}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Fecha de nacimiento" error={errors.fechaNacimiento}>
            <input
              type="date"
              className={`input${errors.fechaNacimiento ? ' invalid' : ''}`}
              value={form.fechaNacimiento}
              onChange={setField('fechaNacimiento')}
              aria-invalid={!!errors.fechaNacimiento}
            />
          </Field>
          <Field label="Teléfono" required hint="10 dígitos" error={errors.telefono}>
            <input
              type="tel"
              inputMode="tel"
              className={`input num${errors.telefono ? ' invalid' : ''}`}
              value={form.telefono}
              onChange={setField('telefono')}
              placeholder="(787) 555-1234"
              autoComplete="tel-national"
              maxLength={20}
              aria-required="true"
              aria-invalid={!!errors.telefono}
            />
          </Field>
        </div>
        <Field label="Correo electrónico" required error={errors.email}>
          <input
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`input${errors.email ? ' invalid' : ''}`}
            value={form.email}
            onChange={setField('email')}
            placeholder="nombre@correo.com"
            autoComplete="email"
            maxLength={100}
            aria-required="true"
            aria-invalid={!!errors.email}
          />
        </Field>
      </FormModal>

      {/* Eliminar paciente */}
      <ConfirmDialog
        open={!!deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title={deleting ? `¿Eliminar a ${fullName(deleting)}?` : ''}
        message={
          deletingCitas
            ? `Este paciente tiene ${plural(deletingCitas, 'cita', 'citas')} en su historial. Es posible que el sistema no permita eliminarlo mientras tenga citas asociadas. Esta acción no se puede deshacer.`
            : 'Se eliminará permanentemente su ficha y datos de contacto. Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar paciente"
      />
    </>
  )
}
