// Especialidades — áreas clínicas de la clínica.
// Cuadrícula de tarjetas con los médicos asignados y la actividad de citas de cada área;
// crear / renombrar (FormModal) y eliminar (ConfirmDialog, solo si no tiene médicos).
import { useCallback, useMemo, useState } from 'react'
import Icon from '../icons.jsx'
import { api, dateOnly, fullName, todayISO } from '../api.js'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormModal,
  IconButton,
  PageHeader,
  SearchInput,
  Segmented,
  useData,
  useToast,
} from '../components/ui.jsx'

const MAX_AVATARS = 4
const NAME_MAX = 100 // VARCHAR(100) en la base de datos
const SORTS = [
  { value: 'nombre', label: 'A–Z' },
  { value: 'medicos', label: 'Médicos' },
  { value: 'citas', label: 'Citas' },
]

// Comparación sin mayúsculas, acentos ni espacios repetidos ("cardiologia" == "Cardiología").
const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const cleanName = (s = '') => s.trim().replace(/\s+/g, ' ')
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
const ring = { boxShadow: '0 0 0 2px var(--surface)', borderRadius: '50%' }

export default function Specialties({ query, navigate }) {
  const { data, loading, error, reload } = useData(['especialidades', 'doctores', 'citas'])
  const toast = useToast()
  const [today] = useState(todayISO)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('nombre')
  // form: null (cerrado) | { item: especialidad|null, nombre, submitted }
  const [form, setForm] = useState(() => (query.get('nueva') === '1' ? { item: null, nombre: '', submitted: false } : null))
  const [deleting, setDeleting] = useState(null)

  // ---------- datos derivados ----------
  const rows = useMemo(() => {
    const specOfDoctor = {}
    const doctorsBySpec = {}
    for (const d of data.doctores ?? []) {
      specOfDoctor[d.idDoctor] = d.idEspecialidad
      if (!doctorsBySpec[d.idEspecialidad]) doctorsBySpec[d.idEspecialidad] = []
      doctorsBySpec[d.idEspecialidad].push(d)
    }
    const stats = {}
    for (const c of data.citas ?? []) {
      const spec = specOfDoctor[c.idDoctor]
      if (spec == null) continue
      const s = (stats[spec] ??= { total: 0, hoy: 0, programadas: 0 })
      const f = dateOnly(c.fecha)
      s.total++
      if (f === today) s.hoy++
      else if (f > today) s.programadas++
    }
    return (data.especialidades ?? []).map((e) => ({
      ...e,
      doctors: (doctorsBySpec[e.idEspecialidad] ?? []).slice().sort((a, b) => a.apellido.localeCompare(b.apellido, 'es')),
      citas: stats[e.idEspecialidad] ?? { total: 0, hoy: 0, programadas: 0 },
    }))
  }, [data, today])

  const visible = useMemo(() => {
    const term = norm(q)
    const list = term
      ? rows.filter((e) => norm(e.nombre).includes(term) || e.doctors.some((d) => norm(fullName(d)).includes(term)))
      : rows.slice()
    if (sort === 'medicos') return list.sort((a, b) => b.doctors.length - a.doctors.length || byName(a, b))
    if (sort === 'citas') return list.sort((a, b) => b.citas.total - a.citas.total || byName(a, b))
    return list.sort(byName)
  }, [rows, q, sort])

  const nameError = useMemo(() => {
    if (!form) return null
    const n = norm(form.nombre)
    if (!n) return form.submitted ? 'Ingrese el nombre de la especialidad.' : null
    const dup = (data.especialidades ?? []).find((e) => e.idEspecialidad !== form.item?.idEspecialidad && norm(e.nombre) === n)
    return dup ? `Ya existe una especialidad llamada “${dup.nombre}”.` : null
  }, [form, data.especialidades])

  // ---------- acciones ----------
  const openCreate = () => setForm({ item: null, nombre: '', submitted: false })
  const openEdit = (e) => setForm({ item: e, nombre: e.nombre, submitted: false })
  const closeForm = useCallback(() => {
    setForm(null)
    if (query.get('nueva')) navigate('especialidades')
  }, [query, navigate])

  const submit = async () => {
    const nombre = cleanName(form.nombre)
    if (!nombre || nameError) {
      setForm((f) => ({ ...f, submitted: true }))
      return
    }
    const { item } = form
    if (item) {
      if (nombre !== item.nombre) {
        await api.update('especialidades', item.idEspecialidad, { idEspecialidad: item.idEspecialidad, nombre })
        toast(`Especialidad renombrada a “${nombre}”`, 'success')
      }
    } else {
      await api.create('especialidades', { nombre })
      toast(`Especialidad “${nombre}” creada`, 'success')
    }
    closeForm()
    reload()
  }

  const confirmDelete = async () => {
    const e = deleting
    try {
      await api.remove('especialidades', e.idEspecialidad)
      toast(`Especialidad “${e.nombre}” eliminada`, 'success')
      reload()
    } catch (err) {
      toast(err.message || 'No se pudo eliminar la especialidad', 'error')
    } finally {
      setDeleting(null)
    }
  }

  // ---------- render ----------
  const firstLoad = loading && !data.especialidades
  const isEmpty = !firstLoad && !error && rows.length === 0
  const doctorCount = data.doctores?.length ?? 0

  let content
  if (error) {
    content = <Card><ErrorState message={error} onRetry={reload} /></Card>
  } else if (firstLoad) {
    content = (
      <div className="grid grid-3" aria-busy="true" aria-label="Cargando especialidades">
        {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} i={i} />)}
      </div>
    )
  } else if (isEmpty) {
    content = (
      <Card>
        <EmptyState
          icon="layers"
          title="Aún no hay especialidades"
          text="Cree la primera área clínica para poder asignar médicos y organizar las citas por especialidad."
          action={<Button variant="primary" icon="plus" onClick={openCreate}>Nueva especialidad</Button>}
        />
      </Card>
    )
  } else if (!visible.length) {
    content = (
      <Card>
        <EmptyState
          icon="search"
          title="Sin resultados"
          text={`Ninguna especialidad ni médico coincide con “${q.trim()}”. Revise la ortografía o pruebe con otro término.`}
          action={<Button icon="x" onClick={() => setQ('')}>Limpiar búsqueda</Button>}
        />
      </Card>
    )
  } else {
    content = (
      <div className="grid grid-3">
        {visible.map((e) => (
          <SpecialtyCard
            key={e.idEspecialidad}
            spec={e}
            onDoctors={() => navigate('doctores')}
            onAddDoctor={() => navigate('doctores', { nueva: '1' })}
            onEdit={() => openEdit(e)}
            onDelete={() => setDeleting(e)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Especialidades"
        subtitle="Áreas clínicas y médicos asignados."
        actions={<Button variant="primary" icon="plus" onClick={openCreate}>Nueva especialidad</Button>}
      />

      <div className="stack" style={{ gap: 16 }}>
        {!isEmpty && (
          <div className="card">
            <div className="toolbar" style={{ borderBottom: 0 }}>
              <SearchInput value={q} onChange={setQ} placeholder="Buscar especialidad o médico…" />
              <div className="spacer" />
              {!firstLoad && !error && (
                <span className="muted num hide-sm" style={{ fontSize: 13 }}>
                  {q.trim()
                    ? `${visible.length} de ${plural(rows.length, 'especialidad', 'especialidades')}`
                    : `${plural(rows.length, 'especialidad', 'especialidades')} · ${plural(doctorCount, 'médico', 'médicos')}`}
                </span>
              )}
              <Segmented options={SORTS} value={sort} onChange={setSort} />
            </div>
          </div>
        )}
        {content}
      </div>

      <FormModal
        open={!!form}
        onClose={closeForm}
        title={form?.item ? 'Editar especialidad' : 'Nueva especialidad'}
        subtitle={form?.item ? 'El nuevo nombre se reflejará en los médicos asignados.' : 'Agregue un área clínica para asignarle médicos.'}
        submitLabel={form?.item ? 'Guardar cambios' : 'Crear especialidad'}
        onSubmit={submit}
        size="sm"
      >
        <Field label="Nombre" required error={nameError} hint="Use el nombre oficial del área, p. ej. Cardiología.">
          <input
            className={`input${nameError ? ' invalid' : ''}`}
            type="text"
            value={form?.nombre ?? ''}
            onChange={(ev) => setForm((f) => ({ ...f, nombre: ev.target.value }))}
            placeholder="Ej. Dermatología"
            maxLength={NAME_MAX}
            autoComplete="off"
            required
            aria-invalid={!!nameError}
          />
        </Field>
      </FormModal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar especialidad?"
        message={deleting && `Se eliminará “${deleting.nombre}” de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar especialidad"
      />
    </>
  )
}

// ---------- piezas de la tarjeta ----------
function SpecialtyCard({ spec, onDoctors, onAddDoctor, onEdit, onDelete }) {
  const n = spec.doctors.length
  const blocked = n > 0
  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-body stack" style={{ flex: 1, gap: 16, paddingTop: 20 }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="stat-icon" aria-hidden="true"><Icon name="layers" size={18} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="card-title" style={{ overflowWrap: 'anywhere' }}>{spec.nombre}</h2>
            <p className="card-sub">
              <button type="button" className="link-btn" style={{ fontSize: 'inherit' }} onClick={onDoctors} title="Ver médicos">
                {plural(n, 'médico', 'médicos')}
              </button>
              <span aria-hidden="true"> · </span>
              <span className="num">{plural(spec.citas.total, 'cita', 'citas')}</span>
            </p>
          </div>
        </div>
        <DoctorStack doctors={spec.doctors} onAdd={onAddDoctor} />
      </div>

      <footer className="card-foot row-between">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {spec.citas.hoy > 0 && <Badge tone="blue" dot>{plural(spec.citas.hoy, 'cita hoy', 'citas hoy')}</Badge>}
          {spec.citas.programadas > 0 && <Badge tone="brand" dot>{plural(spec.citas.programadas, 'programada', 'programadas')}</Badge>}
          {!spec.citas.hoy && !spec.citas.programadas && <Badge>Sin citas próximas</Badge>}
        </div>
        <div className="row" style={{ gap: 2 }}>
          <IconButton icon="edit" label={`Editar ${spec.nombre}`} onClick={onEdit} />
          {blocked ? (
            <span title="Reasigne o elimine los médicos primero" style={{ display: 'inline-flex' }}>
              <IconButton icon="trash" label={`Eliminar ${spec.nombre}`} title="Reasigne o elimine los médicos primero" disabled />
            </span>
          ) : (
            <IconButton icon="trash" label={`Eliminar ${spec.nombre}`} danger onClick={onDelete} />
          )}
        </div>
      </footer>
    </article>
  )
}

function DoctorStack({ doctors, onAdd }) {
  if (!doctors.length) {
    return (
      <div className="row" style={{ gap: 10, minHeight: 28, flexWrap: 'wrap' }}>
        <span className="faint" style={{ fontSize: 13 }}>Sin médicos asignados</span>
        <button type="button" className="link-btn" onClick={onAdd}>
          <Icon name="plus" size={14} />Agregar médico
        </button>
      </div>
    )
  }
  const shown = doctors.slice(0, MAX_AVATARS)
  const extra = doctors.length - shown.length
  const names = doctors.length === 1 ? fullName(doctors[0]) : `${fullName(doctors[0])} y ${doctors.length - 1} más`
  return (
    <div className="row" style={{ gap: 10, minHeight: 28 }}>
      <div style={{ display: 'flex', flex: 'none' }}>
        {shown.map((d, i) => (
          <span key={d.idDoctor} title={fullName(d)} style={{ ...ring, display: 'inline-flex', marginLeft: i ? -8 : 0 }}>
            <Avatar person={d} size="sm" />
          </span>
        ))}
        {extra > 0 && (
          <span
            className="avatar sm num"
            title={doctors.slice(MAX_AVATARS).map(fullName).join(', ')}
            style={{ ...ring, marginLeft: -8, background: 'var(--line-2)', color: 'var(--ink-2)' }}
          >
            +{extra}
          </span>
        )}
      </div>
      <span className="cell-sub" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names}</span>
    </div>
  )
}

function SkeletonCard({ i }) {
  return (
    <div className="card" aria-hidden="true">
      <div className="card-body stack" style={{ gap: 16, paddingTop: 20 }}>
        <div className="row">
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flex: 'none' }} />
          <div className="stack" style={{ gap: 8, flex: 1 }}>
            <div className="skeleton" style={{ width: `${45 + ((i * 13) % 30)}%`, height: 14 }} />
            <div className="skeleton" style={{ width: '38%' }} />
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {[0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />)}
          <div className="skeleton" style={{ width: '30%', marginLeft: 4 }} />
        </div>
      </div>
      <div className="card-foot row-between">
        <div className="skeleton" style={{ width: 96, height: 20, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 56, height: 20 }} />
      </div>
    </div>
  )
}
