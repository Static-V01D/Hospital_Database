/*
 * Citas — agenda de la clínica.
 * Lista, filtra, programa, reprograma y elimina citas. Paciente, médico, especialidad y
 * consulta se resuelven en el cliente (byId); el estado de cada cita se deriva de si tiene
 * consulta registrada y de su fecha respecto a hoy.
 * Parámetros de URL: ?paciente=ID filtra por paciente · ?nueva=1 abre el formulario al entrar.
 */
import { useCallback, useMemo, useState } from 'react'
import Icon from '../icons.jsx'
import { api, dateOnly, fmtDate, fmtPhone, fmtTime, fullName, todayISO } from '../api.js'
import {
  Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, FormModal,
  IconButton, Modal, PageHeader, Person, SearchInput, Segmented, byId, useData, useToast,
} from '../components/ui.jsx'

const RESOURCES_USED = ['citas', 'pacientes', 'doctores', 'especialidades', 'consultas']
const EMPTY = []

const RANGES = [
  { value: 'todas', label: 'Todas' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas', label: 'Pasadas' },
]

const RANGE_EMPTY = {
  hoy: { title: 'No hay citas para hoy', text: 'La agenda de hoy está libre.' },
  proximas: { title: 'No hay citas próximas', text: 'No hay citas programadas a partir de mañana.' },
  pasadas: { title: 'No hay citas pasadas', text: 'Aquí aparecerán las citas con fecha anterior a hoy.' },
}

const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }

// ---------- helpers ----------
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const byName = (a, b) => fullName(a).localeCompare(fullName(b), 'es')
const hhmm = (hora) => String(hora ?? '').slice(0, 5)
const sortKey = (c) => `${dateOnly(c.fecha)}T${hhmm(c.hora)}`

const rangeOf = (cita, today) => {
  const f = dateOnly(cita.fecha)
  return f === today ? 'hoy' : f > today ? 'proximas' : 'pasadas'
}

// Regla compartida de estado de una cita.
function statusOf(cita, attended, today) {
  if (attended) return { label: 'Atendida', tone: 'green' }
  const f = dateOnly(cita.fecha)
  if (f < today) return { label: 'Sin registrar', tone: 'amber' }
  if (f === today) return { label: 'Hoy', tone: 'blue' }
  return { label: 'Programada', tone: 'brand' }
}

const rtfDay = new Intl.RelativeTimeFormat('es-PR', { numeric: 'auto' })
const rtf = new Intl.RelativeTimeFormat('es-PR')
const toUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
// "Hoy", "Mañana", "Hace 3 días", "Dentro de 2 semanas"…
function relativeDay(iso, today) {
  const n = Math.round((toUTC(dateOnly(iso)) - toUTC(today)) / 86400000)
  const a = Math.abs(n)
  const text =
    a < 7 ? rtfDay.format(n, 'day')
      : a < 30 ? rtf.format(Math.trunc(n / 7), 'week')
        : a < 365 ? rtf.format(Math.trunc(n / 30), 'month')
          : rtf.format(Math.trunc(n / 365), 'year')
  return capitalize(text)
}

// Médicos agrupados por especialidad (para <optgroup>), "Sin especialidad" al final.
function groupDoctors(doctores, especialidadesById) {
  const groups = new Map()
  for (const d of [...doctores].sort(byName)) {
    const label = especialidadesById[d.idEspecialidad]?.nombre ?? 'Sin especialidad'
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(d)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'Sin especialidad') - (b === 'Sin especialidad') || a.localeCompare(b, 'es'))
    .map(([label, items]) => ({ label, items }))
}

const blankForm = (idPaciente) => ({
  idPaciente: idPaciente ? String(idPaciente) : '',
  idDoctor: '',
  fecha: todayISO(),
  hora: '09:00',
  motivo: '',
})

const formFromCita = (c) => ({
  idPaciente: String(c.idPaciente ?? ''),
  idDoctor: String(c.idDoctor ?? ''),
  fecha: dateOnly(c.fecha),
  hora: hhmm(c.hora),
  motivo: c.motivo ?? '',
})

const QUARTER_HOUR_MSG = 'Use intervalos de 15 minutos (:00, :15, :30 o :45).'

function validate(form, { pacientesById, doctoresById, citas, editingId, quarterHour }) {
  const e = {}
  if (!form.idPaciente) e.idPaciente = 'Seleccione el paciente.'
  else if (!pacientesById[form.idPaciente]) e.idPaciente = 'El paciente seleccionado no existe.'
  if (!form.idDoctor) e.idDoctor = 'Seleccione el médico.'
  else if (!doctoresById[form.idDoctor]) e.idDoctor = 'El médico seleccionado no existe.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) e.fecha = 'Indique una fecha válida.'
  if (!/^\d{2}:\d{2}$/.test(hhmm(form.hora))) e.hora = 'Indique una hora válida.'
  else if (quarterHour && Number(hhmm(form.hora).slice(3)) % 15) e.hora = QUARTER_HOUR_MSG
  if (!form.motivo.trim()) e.motivo = 'Describa el motivo de la cita.'

  // Evita dobles reservas en el mismo horario.
  if (!e.fecha && !e.hora) {
    const sameSlot = (c) => c.idCita !== editingId && dateOnly(c.fecha) === form.fecha && hhmm(c.hora) === hhmm(form.hora)
    if (!e.idDoctor && citas.some((c) => sameSlot(c) && c.idDoctor === Number(form.idDoctor))) {
      e.hora = `${fullName(doctoresById[form.idDoctor])} ya tiene una cita a esta hora.`
    } else if (!e.idPaciente && citas.some((c) => sameSlot(c) && c.idPaciente === Number(form.idPaciente))) {
      e.hora = 'El paciente ya tiene otra cita a esta hora.'
    }
  }
  return e
}

const inputCls = (base, err) => (err ? `${base} invalid` : base)
// fmtTime() may already end in a period ("4:00 p. m."); avoid doubling it.
const endSentence = (s) => (s.endsWith('.') ? s : `${s}.`)
const truncate = (maxWidth) => ({ maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })

// ---------- page ----------
export default function Appointments({ query, navigate }) {
  const toast = useToast()
  const { data, loading, error, reload } = useData(RESOURCES_USED)
  const citas = data.citas ?? EMPTY
  const pacientes = data.pacientes ?? EMPTY
  const doctores = data.doctores ?? EMPTY
  const especialidades = data.especialidades ?? EMPTY
  const consultas = data.consultas ?? EMPTY
  const firstLoad = loading && !data.citas
  const today = todayISO()

  const pacienteParam = query.get('paciente') || ''
  const pacienteFilter = Number(pacienteParam) || null
  const openedFromQuery = query.get('nueva') === '1'

  // filters
  const [search, setSearch] = useState('')
  const [range, setRange] = useState('todas')
  const [doctorFilter, setDoctorFilter] = useState('')

  // create / edit
  const [formOpen, setFormOpen] = useState(() => query.get('nueva') === '1')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => blankForm(query.get('paciente')))
  const [errors, setErrors] = useState({})

  // delete
  const [toDelete, setToDelete] = useState(null)

  // ---------- lookups & derived lists ----------
  const pacientesById = useMemo(() => byId(pacientes, 'idPaciente'), [pacientes])
  const doctoresById = useMemo(() => byId(doctores, 'idDoctor'), [doctores])
  const especialidadesById = useMemo(() => byId(especialidades, 'idEspecialidad'), [especialidades])
  const consultaByCita = useMemo(() => byId(consultas, 'idCita'), [consultas])

  const pacientesSorted = useMemo(() => [...pacientes].sort(byName), [pacientes])
  const doctorGroups = useMemo(() => groupDoctors(doctores, especialidadesById), [doctores, especialidadesById])

  const rows = useMemo(
    () =>
      citas.map((c) => {
        const pac = pacientesById[c.idPaciente]
        const med = doctoresById[c.idDoctor]
        const esp = med ? especialidadesById[med.idEspecialidad] : undefined
        const consulta = consultaByCita[c.idCita]
        return {
          ...c,
          pac,
          med,
          esp,
          consulta,
          range: rangeOf(c, today),
          status: statusOf(c, Boolean(consulta), today),
          key: sortKey(c),
          text: norm([pac && fullName(pac), med && fullName(med), esp?.nombre, c.motivo].filter(Boolean).join(' ')),
        }
      }),
    [citas, pacientesById, doctoresById, especialidadesById, consultaByCita, today],
  )

  const terms = useMemo(() => norm(search).split(/\s+/).filter(Boolean), [search])

  // Everything except the date range — used for the segment counts.
  const scoped = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!pacienteFilter || r.idPaciente === pacienteFilter) &&
          (!doctorFilter || r.idDoctor === Number(doctorFilter)) &&
          terms.every((t) => r.text.includes(t)),
      ),
    [rows, pacienteFilter, doctorFilter, terms],
  )

  const counts = useMemo(() => {
    const n = { todas: scoped.length, hoy: 0, proximas: 0, pasadas: 0 }
    for (const r of scoped) n[r.range] += 1
    return n
  }, [scoped])

  const visible = useMemo(() => {
    const asc = range === 'hoy' || range === 'proximas'
    return scoped
      .filter((r) => range === 'todas' || r.range === range)
      .sort((a, b) => (asc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)))
  }, [scoped, range])

  const rangeOptions = RANGES.map((o) => ({
    value: o.value,
    label: (
      <>
        {o.label}
        <span className="faint num hide-sm"> · {counts[o.value]}</span>
      </>
    ),
  }))

  const pacienteFiltrado = pacienteFilter ? pacientesById[pacienteFilter] : null
  const pacienteFiltradoName = pacienteFiltrado
    ? fullName(pacienteFiltrado)
    : firstLoad ? 'Cargando…' : `#${pacienteParam}`

  // ---------- actions ----------
  const openCreate = (idPaciente = pacienteParam) => {
    setEditing(null)
    setForm(blankForm(idPaciente))
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(formFromCita(row))
    setErrors({})
    setFormOpen(true)
  }

  // Stable identity: Modal re-runs its focus effect whenever onClose changes.
  const closeForm = useCallback(() => {
    setFormOpen(false)
    if (openedFromQuery) navigate('citas', pacienteParam ? { paciente: pacienteParam } : undefined)
  }, [openedFromQuery, pacienteParam, navigate])

  const closeDelete = useCallback(() => setToDelete(null), [])

  // 15-minute slots, except when editing a legacy cita booked off-grid (keep its minute editable).
  const timeStep = editing && Number(hhmm(editing.hora).slice(3)) % 15 ? 60 : 900
  const validateForm = () =>
    validate(form, { pacientesById, doctoresById, citas, editingId: editing?.idCita, quarterHour: timeStep === 900 })

  // The time input keeps step={timeStep} for 15-minute picker increments, so the browser's step
  // check runs before onSubmit. Swap its native tooltip for the same inline Spanish errors.
  const onTimeInvalid = (e) => {
    e.preventDefault()
    const errs = validateForm()
    setErrors(errs.hora ? errs : { ...errs, hora: QUARTER_HOUR_MSG })
  }

  const setField = (name) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [name]: value }))
    // Changing patient, doctor, date or time may resolve a scheduling conflict shown on "hora".
    const touched = name === 'motivo' ? ['motivo'] : [name, 'hora']
    setErrors((er) => (touched.some((k) => er[k]) ? { ...er, ...Object.fromEntries(touched.map((k) => [k, undefined])) } : er))
  }

  const submit = async () => {
    const errs = validateForm()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    const body = {
      idPaciente: Number(form.idPaciente),
      idDoctor: Number(form.idDoctor),
      fecha: form.fecha,
      hora: `${hhmm(form.hora)}:00`,
      motivo: form.motivo.trim(),
    }
    try {
      if (editing) await api.update('citas', editing.idCita, { idCita: editing.idCita, ...body })
      else await api.create('citas', body)
    } catch (err) {
      toast('No se pudo guardar la cita', 'error')
      throw err
    }
    toast(editing ? 'Cita actualizada correctamente' : 'Cita programada correctamente', 'success')
    closeForm()
    reload()
  }

  const confirmDelete = async () => {
    const cita = toDelete
    try {
      await api.remove('citas', cita.idCita)
      toast('Cita eliminada', 'success')
      reload()
    } catch (err) {
      toast(err.message || 'No se pudo eliminar la cita', 'error')
    } finally {
      setToDelete(null)
    }
  }

  const clearPaciente = () => navigate('citas')

  const clearFilters = () => {
    setSearch('')
    setDoctorFilter('')
    setRange('todas')
    if (pacienteFilter) clearPaciente()
  }

  // ---------- table ----------
  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (r) => (
        <div className="row" title={`${capitalize(fmtDate(r.fecha, LONG_DATE))} · ${relativeDay(r.fecha, today)}`}>
          <div className="date-tile" aria-hidden="true">
            <div className="m">{fmtDate(r.fecha, { month: 'short' }).replace('.', '')}</div>
            <div className="dd">{Number(dateOnly(r.fecha).slice(8, 10))}</div>
          </div>
          <span className="sr-only">{fmtDate(r.fecha, LONG_DATE)}</span>
          <span className="cell-sub hide-sm">{capitalize(fmtDate(r.fecha, { weekday: 'long' }))}</span>
        </div>
      ),
    },
    {
      key: 'hora',
      header: 'Hora',
      render: (r) => <span className="cell-main num" style={{ whiteSpace: 'nowrap' }}>{fmtTime(r.hora)}</span>,
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (r) => (
        <div style={{ maxWidth: 240 }}>
          <Person person={r.pac} sub={r.pac?.telefono ? fmtPhone(r.pac.telefono) : 'Sin teléfono'} />
        </div>
      ),
    },
    {
      key: 'medico',
      header: 'Médico',
      hideSm: true,
      render: (r) =>
        r.med ? (
          <div>
            <div className="cell-main" style={truncate(200)}>{fullName(r.med)}</div>
            <div className="cell-sub" style={truncate(200)}>{r.esp?.nombre ?? 'Sin especialidad'}</div>
          </div>
        ) : (
          <span className="faint">Sin asignar</span>
        ),
    },
    {
      key: 'motivo',
      header: 'Motivo',
      hideSm: true,
      render: (r) => (
        // Shrinks with the viewport so the table fits common laptop widths without scrolling.
        <div title={r.motivo} style={truncate('clamp(110px, 100vw - 1250px, 300px)')}>
          {r.motivo || <span className="faint">—</span>}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => <Badge tone={r.status.tone} dot>{r.status.label}</Badge>,
    },
  ]

  const rowActions = (r) => (
    <>
      {!r.consulta && (
        <IconButton icon="clipboard" label="Registrar consulta" onClick={() => navigate('consultas', { nueva: 1, cita: r.idCita })} />
      )}
      <IconButton icon="edit" label="Editar cita" onClick={() => openEdit(r)} />
      <IconButton icon="trash" label="Eliminar cita" danger onClick={() => setToDelete(r)} />
    </>
  )

  // ---------- empty states ----------
  let empty
  if (!citas.length) {
    empty = (
      <EmptyState
        icon="calendar"
        title="Aún no hay citas programadas"
        text="Programe la primera cita para comenzar a organizar la agenda de la clínica."
        action={<Button variant="primary" icon="plus" onClick={() => openCreate()}>Nueva cita</Button>}
      />
    )
  } else if (terms.length || doctorFilter) {
    empty = (
      <EmptyState
        icon="search"
        title="Sin resultados"
        text={
          terms.length
            ? `No encontramos citas que coincidan con “${search.trim()}”. Revise la ortografía o ajuste los filtros.`
            : 'Ninguna cita coincide con los filtros seleccionados.'
        }
        action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
      />
    )
  } else if (pacienteFilter && !rows.some((r) => r.idPaciente === pacienteFilter)) {
    empty = (
      <EmptyState
        icon="calendar"
        title={`${pacienteFiltradoName} no tiene citas`}
        text="Programe una cita para este paciente o vuelva a la agenda completa."
        action={
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={clearPaciente}>Ver todas las citas</Button>
            <Button variant="primary" icon="plus" onClick={() => openCreate()}>Agendar cita</Button>
          </div>
        }
      />
    )
  } else {
    const msg = RANGE_EMPTY[range] ?? RANGE_EMPTY.hoy
    empty = (
      <EmptyState
        icon="calendar"
        title={msg.title}
        text={msg.text}
        action={
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={() => setRange('todas')}>Ver todas</Button>
            {range !== 'pasadas' && <Button variant="primary" icon="plus" onClick={() => openCreate()}>Nueva cita</Button>}
          </div>
        }
      />
    )
  }

  // ---------- form helpers ----------
  const deleteWhen = toDelete ? `${fmtDate(toDelete.fecha, LONG_DATE)} a las ${fmtTime(toDelete.hora)}` : ''

  return (
    <>
      <PageHeader
        title="Citas"
        subtitle="Programe, reprograme y dé seguimiento a las citas médicas."
        actions={<Button variant="primary" icon="plus" onClick={() => openCreate()}>Nueva cita</Button>}
      />

      <Card>
        <div className="toolbar">
          <div style={{ display: 'grid', flex: '1 1 260px', maxWidth: 380 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Paciente, médico o motivo…" />
          </div>
          <select
            className="select"
            aria-label="Filtrar por médico"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 190, height: 38 }}
          >
            <option value="">Todos los médicos</option>
            {doctorGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((d) => <option key={d.idDoctor} value={d.idDoctor}>{fullName(d)}</option>)}
              </optgroup>
            ))}
          </select>
          {pacienteFilter && (
            <Badge tone="brand">
              Paciente: {pacienteFiltradoName}
              <button type="button" className="link-btn" onClick={clearPaciente} aria-label="Quitar filtro de paciente" title="Quitar filtro">
                <Icon name="x" size={13} strokeWidth={2.25} />
              </button>
            </Badge>
          )}
          <div className="spacer" />
          <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Segmented options={rangeOptions} value={range} onChange={setRange} />
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          // Contains the table's visually-hidden (absolute) labels so they can't widen the page on mobile.
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <DataTable
              columns={columns}
              rows={visible}
              rowKey="idCita"
              loading={firstLoad}
              empty={empty}
              onRowClick={openEdit}
              actions={rowActions}
              footer={
                <span>
                  Mostrando <strong className="num">{visible.length}</strong> de <span className="num">{citas.length}</span>{' '}
                  {citas.length === 1 ? 'cita' : 'citas'}
                </span>
              }
            />
          </div>
        )}
      </Card>

      {/* ---------- create / edit ---------- */}
      <FormModal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar cita' : 'Nueva cita'}
        subtitle={
          editing
            ? `${fullName(editing.pac)} · ${fmtDate(editing.fecha)} · ${fmtTime(editing.hora)}`
            : 'Complete los datos para programar la cita.'
        }
        submitLabel={editing ? 'Guardar cambios' : 'Programar cita'}
        onSubmit={submit}
      >
        <Field
          label="Paciente"
          required
          error={errors.idPaciente}
          hint={
            !loading && !pacientes.length ? (
              <>
                No hay pacientes registrados.{' '}
                <button type="button" className="link-btn" onClick={() => navigate('pacientes', { nuevo: 1 })}>Registrar paciente</button>
              </>
            ) : undefined
          }
        >
          <select className={inputCls('select', errors.idPaciente)} value={form.idPaciente} onChange={setField('idPaciente')}>
            <option value="">{firstLoad ? 'Cargando pacientes…' : 'Seleccione un paciente'}</option>
            {pacientesSorted.map((p) => <option key={p.idPaciente} value={p.idPaciente}>{fullName(p)}</option>)}
          </select>
        </Field>

        <Field
          label="Médico"
          required
          error={errors.idDoctor}
          hint={
            !loading && !doctores.length ? (
              <>
                No hay médicos registrados.{' '}
                <button type="button" className="link-btn" onClick={() => navigate('doctores', { nueva: 1 })}>Registrar médico</button>
              </>
            ) : undefined
          }
        >
          <select className={inputCls('select', errors.idDoctor)} value={form.idDoctor} onChange={setField('idDoctor')}>
            <option value="">{firstLoad ? 'Cargando médicos…' : 'Seleccione un médico'}</option>
            {doctorGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((d) => <option key={d.idDoctor} value={d.idDoctor}>{fullName(d)}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <div className="form-row">
          <Field
            label="Fecha"
            required
            error={errors.fecha}
            hint={form.fecha && form.fecha < today ? 'Fecha anterior a hoy: la cita aparecerá como pasada.' : undefined}
          >
            <input type="date" className={inputCls('input', errors.fecha)} value={form.fecha} onChange={setField('fecha')} />
          </Field>
          <Field label="Hora" required error={errors.hora} hint={timeStep === 900 ? 'Intervalos de 15 minutos.' : undefined}>
            <input
              type="time"
              step={timeStep}
              className={inputCls('input', errors.hora)}
              value={form.hora}
              onChange={setField('hora')}
              onInvalid={onTimeInvalid}
            />
          </Field>
        </div>

        <Field label="Motivo de la cita" required error={errors.motivo} hint="Breve descripción para el equipo médico.">
          <textarea
            className={inputCls('textarea', errors.motivo)}
            rows={3}
            maxLength={500}
            placeholder="Ej.: chequeo anual, seguimiento de laboratorio, dolor de cabeza persistente…"
            value={form.motivo}
            onChange={setField('motivo')}
          />
        </Field>
      </FormModal>

      {/* ---------- delete ---------- */}
      <ConfirmDialog
        open={Boolean(toDelete) && !toDelete.consulta}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="¿Eliminar esta cita?"
        message={
          toDelete && (
            <>
              Se eliminará la cita de <strong>{fullName(toDelete.pac)}</strong> del {endSentence(deleteWhen)} Esta acción no se
              puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar cita"
      />

      {/* A cita with a registered consulta can't be deleted until the consulta is removed. */}
      <Modal
        open={Boolean(toDelete?.consulta)}
        onClose={closeDelete}
        title="No se puede eliminar esta cita"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeDelete}>Cerrar</Button>
            <Button variant="primary" icon="clipboard" onClick={() => navigate('consultas')}>Ir a Consultas</Button>
          </>
        }
      >
        {toDelete && (
          <p className="muted">
            La cita de <strong>{fullName(toDelete.pac)}</strong> del {deleteWhen} ya tiene una consulta registrada.
            Para eliminar la cita, elimine primero la consulta desde la sección Consultas.
          </p>
        )}
      </Modal>
    </>
  )
}
