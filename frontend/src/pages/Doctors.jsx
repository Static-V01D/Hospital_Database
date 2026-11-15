/*
 * Médicos — "Cuerpo médico" (route 'doctores').
 * Card grid of doctors with their specialty and appointment load (today / upcoming / total,
 * plus the next appointment), filterable by name and specialty. Create/edit via FormModal,
 * delete via ConfirmDialog (warns when the doctor still has citas).
 * All relations are joined client-side: doctores + especialidades + citas + pacientes.
 * Query params: ?nuevo=1 (or ?nueva=1) opens the create form; ?especialidad=<id> pre-filters.
 */
import { useCallback, useMemo, useState } from 'react'
import Icon from '../icons.jsx'
import { api, dateOnly, fmtDate, fmtTime, fullName, todayISO } from '../api.js'
import {
  useData, byId, useToast, Button, IconButton, Badge, Avatar, PageHeader, SearchInput,
  Segmented, EmptyState, ErrorState, Field, FormModal, ConfirmDialog,
} from '../components/ui.jsx'

const KEYS = ['doctores', 'especialidades', 'citas', 'pacientes']
const MAX_SEGMENTS = 5 // more specialties than this → use a <select> instead of a segmented control
const NAME_MAX = 50 // VARCHAR(50) in the database

// ---------- small layout styles (one-off, no matching class in the design system) ----------
const CARD_STYLE = { display: 'flex', flexDirection: 'column' }
const BODY_STYLE = { flex: 1, gap: 16 }
const STATS_BOX = {
  display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)',
}
const STAT_CELL = { padding: '10px 6px', textAlign: 'center' }
const STAT_CELL_SEP = { ...STAT_CELL, borderLeft: '1px solid var(--line)' }
const STAT_VALUE = { fontSize: 20, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }
const ICON_ON = { flex: 'none' }
const ICON_IDLE = { flex: 'none', background: 'var(--line-2)', color: 'var(--faint)' }
const SEGMENT_WRAP = { maxWidth: '100%', overflowX: 'auto', whiteSpace: 'nowrap' }

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0')
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Time snapshot taken once on mount (used to classify citas as today / upcoming / past).
function snapshotNow() {
  const d = new Date()
  return {
    date: todayISO(),
    tomorrow: isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:00`,
  }
}

// Accent- and case-insensitive text for searching ("rodriguez" matches "Rodríguez").
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const citaKey = (c) => `${dateOnly(c.fecha)} ${c.hora || ''}`
const byDoctorName = (a, b) =>
  `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es', { sensitivity: 'base' })

const EMPTY_STATS = { today: 0, upcoming: 0, total: 0, next: null, last: null }

// Per-doctor appointment load: { [idDoctor]: { today, upcoming, total, next, last } }
function buildStats(citas, now) {
  const map = {}
  for (const c of citas) {
    if (!map[c.idDoctor]) map[c.idDoctor] = { ...EMPTY_STATS }
    const s = map[c.idDoctor]
    const day = dateOnly(c.fecha)
    const key = citaKey(c)
    s.total += 1
    if (day === now.date) s.today += 1
    else if (day > now.date) s.upcoming += 1
    const pending = day > now.date || (day === now.date && (c.hora || '') >= now.time)
    if (pending) {
      if (!s.next || key < citaKey(s.next)) s.next = c
    } else if (!s.last || key > citaKey(s.last)) {
      s.last = c
    }
  }
  return map
}

// "Hoy, 1:15 p. m." · "Mañana, 9:45 a. m." · "Jue, 20 nov, 3:00 p. m."
function whenLabel(cita, now) {
  const day = dateOnly(cita.fecha)
  let label
  if (day === now.date) label = 'Hoy'
  else if (day === now.tomorrow) label = 'Mañana'
  else {
    const opts = { weekday: 'short', day: 'numeric', month: 'short' }
    if (day.slice(0, 4) !== now.date.slice(0, 4)) opts.year = 'numeric'
    const s = fmtDate(day, opts)
    label = s.charAt(0).toUpperCase() + s.slice(1)
  }
  return `${label}, ${fmtTime(cita.hora)}`
}

// "hoy, 8:30 a. m." for earlier today, otherwise "7 nov 2026".
const lastLabel = (cita, now) =>
  dateOnly(cita.fecha) === now.date ? `hoy, ${fmtTime(cita.hora)}` : fmtDate(cita.fecha)

const opensFromQuery = (query) => query.get('nuevo') === '1' || query.get('nueva') === '1'
const blankForm = (idEspecialidad = '') => ({ id: null, label: '', nombre: '', apellido: '', idEspecialidad: idEspecialidad || '' })
const BLANK = blankForm()

function validate(form, specById) {
  const errs = {}
  const nombre = form.nombre.trim()
  const apellido = form.apellido.trim()
  if (!nombre) errs.nombre = 'Ingrese el nombre del médico.'
  else if (nombre.length > NAME_MAX) errs.nombre = `Máximo ${NAME_MAX} caracteres.`
  if (!apellido) errs.apellido = 'Ingrese el apellido del médico.'
  else if (apellido.length > NAME_MAX) errs.apellido = `Máximo ${NAME_MAX} caracteres.`
  if (!Object.keys(specById).length) errs.idEspecialidad = 'Primero debe crear una especialidad.'
  else if (!form.idEspecialidad) errs.idEspecialidad = 'Seleccione una especialidad.'
  else if (!specById[form.idEspecialidad]) errs.idEspecialidad = 'La especialidad seleccionada ya no existe. Elija otra.'
  return errs
}

// ---------- presentational pieces ----------
function DoctorCard({ doctor, specialty, stats, patient, now, onViewCitas, onEdit, onDelete }) {
  const name = fullName(doctor)
  const { next, last } = stats
  const nextIsToday = Boolean(next) && dateOnly(next.fecha) === now.date
  const items = [
    { label: 'Citas hoy', value: stats.today, title: 'Citas programadas para hoy' },
    { label: 'Próximas', value: stats.upcoming, title: 'Citas programadas a partir de mañana' },
    { label: 'Total', value: stats.total, title: 'Todas las citas registradas' },
  ]

  return (
    <article className="card" style={CARD_STYLE} aria-label={name}>
      <div className="card-body stack" style={BODY_STYLE}>
        <div className="person" style={{ gap: 14 }}>
          <Avatar person={doctor} size="lg" />
          <div>
            <h3 className="cell-main" style={{ fontSize: 15 }} title={name}>{name}</h3>
            <div style={{ marginTop: 5 }}>
              {specialty ? <Badge tone="brand">{specialty.nombre}</Badge> : <Badge>Sin especialidad</Badge>}
            </div>
          </div>
        </div>

        <div style={STATS_BOX}>
          {items.map((it, i) => (
            <div key={it.label} style={i ? STAT_CELL_SEP : STAT_CELL} title={it.title}>
              <div className={`num${it.value ? '' : ' faint'}`} style={STAT_VALUE}>{it.value}</div>
              <div className="cell-sub" style={{ whiteSpace: 'nowrap' }}>{it.label}</div>
            </div>
          ))}
        </div>

        <div className="person">
          <span className={`stat-icon${nextIsToday ? ' blue' : ''}`} style={next ? ICON_ON : ICON_IDLE}>
            <Icon name="clock" size={17} />
          </span>
          {next ? (
            <div>
              <div className="cell-main">{whenLabel(next, now)}</div>
              <div className="cell-sub">Próxima cita con {patient ? fullName(patient) : `paciente #${next.idPaciente}`}</div>
            </div>
          ) : (
            <div>
              <div className="cell-main" style={{ color: 'var(--muted)' }}>Sin citas próximas</div>
              <div className="cell-sub">{last ? `Última cita: ${lastLabel(last, now)}` : 'Aún no tiene citas asignadas'}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card-foot row-between">
        <button type="button" className="link-btn" onClick={onViewCitas}>
          Ver citas <Icon name="arrowRight" size={14} />
        </button>
        <div className="row" style={{ gap: 2 }}>
          <IconButton icon="edit" label={`Editar a ${name}`} onClick={onEdit} />
          <IconButton icon="trash" label={`Eliminar a ${name}`} danger onClick={onDelete} />
        </div>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="card" style={CARD_STYLE} aria-hidden="true">
      <div className="card-body stack" style={BODY_STYLE}>
        <div className="row" style={{ gap: 14 }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', flex: 'none' }} />
          <div className="stack" style={{ flex: 1, gap: 8 }}>
            <div className="skeleton" style={{ width: '62%', height: 14 }} />
            <div className="skeleton" style={{ width: 96, height: 20, borderRadius: 999 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 64, borderRadius: 'var(--r)' }} />
        <div className="row">
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flex: 'none' }} />
          <div className="stack" style={{ flex: 1, gap: 6 }}>
            <div className="skeleton" style={{ width: '55%' }} />
            <div className="skeleton" style={{ width: '78%', height: 10 }} />
          </div>
        </div>
      </div>
      <div className="card-foot row-between" style={{ minHeight: 59 }}>
        <div className="skeleton" style={{ width: 72 }} />
        <div className="skeleton" style={{ width: 56, height: 18 }} />
      </div>
    </div>
  )
}

// ---------- page ----------
export default function Doctors({ query, navigate }) {
  const { data, error, reload } = useData(KEYS)
  const toast = useToast()
  const [now] = useState(snapshotNow)
  const [search, setSearch] = useState('')
  const [spec, setSpec] = useState(() => query.get('especialidad') || 'all')
  const [editor, setEditor] = useState(() => (opensFromQuery(query) ? blankForm(query.get('especialidad')) : null))
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(null)

  const { doctores, especialidades, citas, pacientes } = useMemo(() => ({
    doctores: data.doctores || [],
    especialidades: data.especialidades || [],
    citas: data.citas || [],
    pacientes: data.pacientes || [],
  }), [data])

  const specById = useMemo(() => byId(especialidades, 'idEspecialidad'), [especialidades])
  const patientById = useMemo(() => byId(pacientes, 'idPaciente'), [pacientes])
  const stats = useMemo(() => buildStats(citas, now), [citas, now])
  const specOptions = useMemo(
    () => [...especialidades].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [especialidades],
  )
  const segments = useMemo(
    () => [{ value: 'all', label: 'Todas' }, ...specOptions.map((e) => ({ value: String(e.idEspecialidad), label: e.nombre }))],
    [specOptions],
  )

  // A filter pointing at a specialty that no longer exists falls back to "Todas".
  const activeSpec = spec !== 'all' && data.especialidades && !specById[spec] ? 'all' : spec
  const activeSpecName = activeSpec === 'all' ? null : specById[activeSpec]?.nombre
  const q = norm(search)

  const visible = useMemo(() => {
    const tokens = q ? q.split(/\s+/) : []
    return doctores
      .filter((d) => activeSpec === 'all' || String(d.idEspecialidad) === activeSpec)
      .filter((d) => {
        if (!tokens.length) return true
        const hay = norm(`${d.nombre} ${d.apellido} ${specById[d.idEspecialidad]?.nombre ?? ''}`)
        return tokens.every((t) => hay.includes(t))
      })
      .sort(byDoctorName)
  }, [doctores, specById, activeSpec, q])

  // ----- actions -----
  const closeEditor = useCallback(() => {
    setEditor(null)
    if (opensFromQuery(query)) navigate('doctores')
  }, [query, navigate])
  const closeDelete = useCallback(() => setDeleting(null), [])

  const openCreate = (presetSpec) => {
    const fallback = activeSpec !== 'all' ? activeSpec : especialidades.length === 1 ? String(especialidades[0].idEspecialidad) : ''
    setErrors({})
    setEditor(blankForm(presetSpec ?? fallback))
  }
  const openEdit = (d) => {
    setErrors({})
    setEditor({
      id: d.idDoctor,
      label: fullName(d),
      nombre: d.nombre ?? '',
      apellido: d.apellido ?? '',
      idEspecialidad: d.idEspecialidad != null ? String(d.idEspecialidad) : '',
    })
  }
  const setField = (key) => (e) => {
    const value = e.target.value
    setEditor((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
  }
  const clearFilters = () => {
    setSearch('')
    setSpec('all')
  }

  const save = async () => {
    const errs = validate(editor, specById)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const body = {
      nombre: editor.nombre.trim(),
      apellido: editor.apellido.trim(),
      idEspecialidad: Number(editor.idEspecialidad),
    }
    const name = `${body.nombre} ${body.apellido}`
    try {
      if (editor.id == null) {
        await api.create('doctores', body)
        toast(`${name} se añadió al cuerpo médico`, 'success')
      } else {
        await api.update('doctores', editor.id, { idDoctor: editor.id, ...body })
        toast(`Se actualizaron los datos de ${name}`, 'success')
      }
    } catch (e) {
      toast(e.message || 'No se pudo guardar el médico', 'error')
      throw e // FormModal also shows it inline
    }
    closeEditor()
    reload()
  }

  const confirmDelete = async () => {
    const d = deleting
    if (!d) return
    const { total } = stats[d.idDoctor] || EMPTY_STATS
    try {
      await api.remove('doctores', d.idDoctor)
      toast(`${fullName(d)} se eliminó del cuerpo médico`, 'success')
      reload()
    } catch (e) {
      toast(
        total
          ? `No se pudo eliminar a ${fullName(d)}: tiene citas asociadas. Reasígnelas o elimínelas primero.`
          : e.message || 'No se pudo eliminar al médico',
        'error',
      )
    } finally {
      setDeleting(null)
    }
  }

  // ----- main content -----
  let content
  if (error) {
    content = <div className="card"><ErrorState message={error} onRetry={reload} /></div>
  } else if (!data.doctores) {
    content = (
      <div className="grid grid-3" aria-busy="true" aria-label="Cargando médicos">
        {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  } else if (!doctores.length) {
    content = (
      <div className="card">
        <EmptyState
          icon="stethoscope"
          title="Aún no hay médicos registrados"
          text="Añada al primer médico para asignarle una especialidad y empezar a programar sus citas."
          action={<Button variant="primary" icon="plus" onClick={() => openCreate()}>Añadir médico</Button>}
        />
      </div>
    )
  } else if (!visible.length) {
    content = (
      <div className="card">
        {q ? (
          <EmptyState
            icon="search"
            title="Sin resultados"
            text={`Ningún médico coincide con “${search.trim()}”${activeSpecName ? ` en ${activeSpecName}` : ''}. Revise la ortografía o pruebe con otro término.`}
            action={<Button icon="x" onClick={clearFilters}>Limpiar filtros</Button>}
          />
        ) : (
          <EmptyState
            icon="stethoscope"
            title={`No hay médicos en ${activeSpecName ?? 'esta especialidad'}`}
            text="Todavía no se ha asignado ningún médico a esta especialidad."
            action={
              <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
                <Button onClick={() => setSpec('all')}>Ver todos</Button>
                <Button variant="primary" icon="plus" onClick={() => openCreate(activeSpec)}>Añadir médico</Button>
              </div>
            }
          />
        )}
      </div>
    )
  } else {
    content = (
      <div className="grid grid-3">
        {visible.map((d) => {
          const s = stats[d.idDoctor] || EMPTY_STATS
          return (
            <DoctorCard
              key={d.idDoctor}
              doctor={d}
              specialty={specById[d.idEspecialidad]}
              stats={s}
              patient={s.next ? patientById[s.next.idPaciente] : null}
              now={now}
              onViewCitas={() => navigate('citas')}
              onEdit={() => openEdit(d)}
              onDelete={() => setDeleting(d)}
            />
          )
        })}
      </div>
    )
  }

  const countLabel = visible.length === doctores.length
    ? plural(doctores.length, 'médico', 'médicos')
    : `${visible.length} de ${plural(doctores.length, 'médico', 'médicos')}`

  // ----- modals -----
  const form = editor || BLANK
  const isEdit = form.id != null
  const noSpecs = Boolean(data.especialidades) && especialidades.length === 0
  const delStats = deleting ? stats[deleting.idDoctor] || EMPTY_STATS : EMPTY_STATS
  const delPending = delStats.today + delStats.upcoming

  return (
    <>
      <PageHeader
        title="Cuerpo médico"
        subtitle="Médicos, especialidades y carga de citas."
        actions={<Button variant="primary" icon="plus" onClick={() => openCreate()}>Añadir médico</Button>}
      />

      <div className="stack" style={{ gap: 16 }}>
        <div className="card">
          <div className="toolbar" style={{ borderBottom: 0 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar médico…" />
            {especialidades.length > MAX_SEGMENTS ? (
              <select
                className="select"
                aria-label="Filtrar por especialidad"
                value={activeSpec}
                onChange={(e) => setSpec(e.target.value)}
                style={{ width: 'auto', minWidth: 200, height: 38 }}
              >
                <option value="all">Todas las especialidades</option>
                {specOptions.map((e) => <option key={e.idEspecialidad} value={String(e.idEspecialidad)}>{e.nombre}</option>)}
              </select>
            ) : (
              <div style={SEGMENT_WRAP}>
                <Segmented options={segments} value={activeSpec} onChange={setSpec} />
              </div>
            )}
            <span className="spacer" />
            {doctores.length > 0 && (
              <span className="muted num hide-sm" style={{ fontSize: 13 }}>{countLabel}</span>
            )}
          </div>
        </div>

        {content}
      </div>

      <FormModal
        open={editor !== null}
        onClose={closeEditor}
        title={isEdit ? 'Editar médico' : 'Añadir médico'}
        subtitle={isEdit ? `Actualice los datos de ${form.label}.` : 'Registre un nuevo miembro del cuerpo médico.'}
        submitLabel={isEdit ? 'Guardar cambios' : 'Añadir médico'}
        onSubmit={save}
      >
        {noSpecs && (
          <div className="banner" role="note">
            <Icon name="info" size={16} />
            <span style={{ flex: 1 }}>Aún no hay especialidades registradas. Cree al menos una para asignarla al médico.</span>
            <button type="button" className="link-btn" onClick={() => navigate('especialidades', { nueva: '1' })}>
              Crear especialidad <Icon name="arrowRight" size={14} />
            </button>
          </div>
        )}
        <div className="form-row">
          <Field label="Nombre" required error={errors.nombre}>
            <input
              className={`input${errors.nombre ? ' invalid' : ''}`}
              type="text"
              required
              maxLength={NAME_MAX}
              autoComplete="off"
              placeholder="Ej. Carlos"
              value={form.nombre}
              onChange={setField('nombre')}
              aria-invalid={Boolean(errors.nombre)}
            />
          </Field>
          <Field label="Apellido" required error={errors.apellido}>
            <input
              className={`input${errors.apellido ? ' invalid' : ''}`}
              type="text"
              required
              maxLength={NAME_MAX}
              autoComplete="off"
              placeholder="Ej. Rodríguez"
              value={form.apellido}
              onChange={setField('apellido')}
              aria-invalid={Boolean(errors.apellido)}
            />
          </Field>
        </div>
        <Field
          label="Especialidad"
          required
          error={errors.idEspecialidad}
          hint={noSpecs ? undefined : 'Se muestra en su ficha y permite filtrar el cuerpo médico.'}
        >
          <select
            className={`select${errors.idEspecialidad ? ' invalid' : ''}`}
            required
            disabled={noSpecs}
            value={form.idEspecialidad}
            onChange={setField('idEspecialidad')}
            aria-invalid={Boolean(errors.idEspecialidad)}
          >
            <option value="" disabled>{noSpecs ? 'No hay especialidades disponibles' : 'Seleccione una especialidad'}</option>
            {specOptions.map((e) => <option key={e.idEspecialidad} value={String(e.idEspecialidad)}>{e.nombre}</option>)}
          </select>
        </Field>
      </FormModal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title={deleting ? `¿Eliminar a ${fullName(deleting)}?` : ''}
        confirmLabel={delStats.total ? 'Eliminar de todos modos' : 'Eliminar médico'}
        message={
          delStats.total ? (
            <>
              Este médico tiene <strong>{plural(delStats.total, 'cita registrada', 'citas registradas')}</strong>
              {delPending ? `, ${delPending === 1 ? '1 de ellas pendiente' : `${delPending} de ellas pendientes`}` : ''}.
              {' '}El sistema puede rechazar la eliminación o dejar esas citas sin médico asignado; se recomienda reasignarlas antes.
              {' '}Esta acción no se puede deshacer.
            </>
          ) : (
            'Se eliminará su ficha del cuerpo médico. Esta acción no se puede deshacer.'
          )
        }
      />
    </>
  )
}
