// Panel general — daily overview for the front desk: key counts, today's agenda
// (or the next appointments when today is free), workload per specialty and the
// latest recorded consultations. Read-only page; all joins are done client-side.
import { useMemo, useState } from 'react'
import Icon from '../icons.jsx'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Person, StatCard, byId, useData } from '../components/ui.jsx'
import { dateOnly, fmtDate, fmtTime, fullName, todayISO } from '../api.js'

const RESOURCES = ['citas', 'pacientes', 'doctores', 'especialidades', 'consultas']
const MAX_SPECIALTIES = 6
const MAX_UPCOMING = 5
const MAX_RECENT = 4

// ---------------- helpers ----------------
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const sortKey = (c) => `${dateOnly(c.fecha)}T${c.hora || ''}`

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  const pad = (v) => String(v).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

// Shared appointment-status rule (same as the Citas page).
function citaStatus(cita, attended, today) {
  if (attended) return { label: 'Atendida', tone: 'green' }
  const f = dateOnly(cita.fecha)
  if (f < today) return { label: 'Sin registrar', tone: 'amber' }
  if (f === today) return { label: 'Hoy', tone: 'blue' }
  return { label: 'Programada', tone: 'brand' }
}

// "8:30 a. m." → { t: '8:30', d: 'a. m.' } so it fits the narrow time block.
function splitTime(hms) {
  const s = fmtTime(hms)
  const m = s.match(/^(\d{1,2}:\d{2})\s*(.*)$/)
  return m ? { t: m[1], d: m[2] } : { t: s, d: '' }
}

// Short date; adds the year only when it differs from the current one.
function shortDate(iso, today) {
  if (!iso) return '—'
  const sameYear = dateOnly(iso).slice(0, 4) === today.slice(0, 4)
  return fmtDate(iso, sameYear ? { day: 'numeric', month: 'short' } : undefined)
}

// ---------------- small presentational pieces ----------------
function LinkAction({ children, onClick }) {
  return (
    <button type="button" className="link-btn" onClick={onClick}>
      {children}
      <Icon name="arrowRight" size={14} />
    </button>
  )
}

function DoctorName({ doctor }) {
  return (
    <span className="row cell-sub hide-sm" style={{ gap: 6, whiteSpace: 'nowrap' }} title="Médico asignado">
      <Icon name="stethoscope" size={14} />
      {doctor ? fullName(doctor) : 'Médico no asignado'}
    </span>
  )
}

function AgendaItem({ cita }) {
  const { t, d } = splitTime(cita.hora)
  return (
    <div className="list-item" role="listitem">
      <div className="time-block">
        <div className="t">{t}</div>
        {d && <div className="d">{d}</div>}
      </div>
      <div className="vline hide-sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Person person={cita.paciente} sub={cita.motivo || 'Sin motivo indicado'} />
      </div>
      <DoctorName doctor={cita.medico} />
      <Badge tone={cita.status.tone} dot>{cita.status.label}</Badge>
    </div>
  )
}

function UpcomingItem({ cita }) {
  return (
    <div className="list-item" role="listitem">
      <div className="date-tile" title={capitalize(fmtDate(cita.fecha, { weekday: 'long', day: 'numeric', month: 'long' }))}>
        <div className="m">{fmtDate(cita.fecha, { month: 'short' }).replace('.', '')}</div>
        <div className="dd">{fmtDate(cita.fecha, { day: 'numeric' })}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Person person={cita.paciente} sub={`${fmtTime(cita.hora)} · ${cita.motivo || 'Sin motivo indicado'}`} />
      </div>
      <DoctorName doctor={cita.medico} />
      <Badge tone={cita.status.tone} dot>{cita.status.label}</Badge>
    </div>
  )
}

function ListSkeleton({ rows = 4, lead = true }) {
  return (
    <div className="list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="list-item" key={i}>
          {lead && <div className="skeleton" style={{ width: 48, height: 14, flex: 'none' }} />}
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flex: 'none' }} />
          <div className="stack" style={{ flex: 1, gap: 8 }}>
            <div className="skeleton" style={{ width: `${62 - i * 8}%` }} />
            <div className="skeleton" style={{ width: `${40 + i * 6}%`, height: 10 }} />
          </div>
          <div className="skeleton hide-sm" style={{ width: 72, height: 22, borderRadius: 999, flex: 'none' }} />
        </div>
      ))}
    </div>
  )
}

function LoadSkeleton() {
  return (
    <div className="card-body stack" style={{ gap: 18 }} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div className="stack" style={{ gap: 8 }} key={i}>
          <div className="row-between">
            <div className="skeleton" style={{ width: `${48 - i * 6}%` }} />
            <div className="skeleton" style={{ width: 52 }} />
          </div>
          <div className="skeleton" style={{ height: 8, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  )
}

const footSkeleton = <span className="skeleton" style={{ display: 'block', width: 120, height: 12, margin: '3px 0 4px' }} />

// ---------------- page ----------------
export default function Dashboard({ navigate }) {
  const { data, loading, error, reload } = useData(RESOURCES)
  // Fixed for the life of the page so render stays pure.
  const [clock] = useState(() => ({ today: todayISO(), hour: new Date().getHours() }))
  const { today } = clock

  const view = useMemo(() => {
    const citas = data.citas ?? []
    const pacientes = data.pacientes ?? []
    const doctores = data.doctores ?? []
    const especialidades = data.especialidades ?? []
    const consultas = data.consultas ?? []

    const pacientesById = byId(pacientes, 'idPaciente')
    const doctoresById = byId(doctores, 'idDoctor')
    const citasById = byId(citas, 'idCita')
    const attended = new Set(consultas.map((c) => c.idCita))
    const weekEnd = addDaysISO(today, 7)

    const decorate = (c) => ({
      ...c,
      paciente: pacientesById[c.idPaciente],
      medico: doctoresById[c.idDoctor],
      status: citaStatus(c, attended.has(c.idCita), today),
    })

    const sorted = [...citas].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    const todayCitas = sorted.filter((c) => dateOnly(c.fecha) === today).map(decorate)
    const upcoming = sorted.filter((c) => dateOnly(c.fecha) > today).slice(0, MAX_UPCOMING).map(decorate)
    const todayAttended = todayCitas.filter((c) => attended.has(c.idCita)).length

    const nextWeek = citas.filter((c) => {
      const f = dateOnly(c.fecha)
      return f > today && f <= weekEnd
    }).length
    const activePatients = new Set(
      citas.filter((c) => dateOnly(c.fecha) >= today && !attended.has(c.idCita)).map((c) => c.idPaciente),
    ).size
    const specialtiesInUse = new Set(doctores.map((d) => d.idEspecialidad).filter((id) => id != null)).size

    // Workload per specialty: each cita counts toward its doctor's specialty.
    const citasPorEsp = {}
    const medicosPorEsp = {}
    doctores.forEach((d) => {
      medicosPorEsp[d.idEspecialidad] = (medicosPorEsp[d.idEspecialidad] || 0) + 1
    })
    citas.forEach((c) => {
      const esp = doctoresById[c.idDoctor]?.idEspecialidad
      if (esp != null) citasPorEsp[esp] = (citasPorEsp[esp] || 0) + 1
    })
    const load = especialidades
      .map((e) => ({
        id: e.idEspecialidad,
        nombre: e.nombre,
        citas: citasPorEsp[e.idEspecialidad] || 0,
        medicos: medicosPorEsp[e.idEspecialidad] || 0,
      }))
      .sort((a, b) => b.citas - a.citas || a.nombre.localeCompare(b.nombre, 'es'))
    const maxLoad = Math.max(0, ...load.map((x) => x.citas))

    const recent = [...consultas]
      .sort((a, b) => b.idConsulta - a.idConsulta)
      .slice(0, MAX_RECENT)
      .map((c) => {
        const cita = citasById[c.idCita]
        return { ...c, cita, paciente: cita ? pacientesById[cita.idPaciente] : undefined }
      })

    return {
      todayCitas,
      upcoming,
      todayAttended,
      nextWeek,
      weekEnd,
      activePatients,
      specialtiesInUse,
      load,
      maxLoad,
      recent,
      totalPacientes: pacientes.length,
      totalDoctores: doctores.length,
    }
  }, [data, today])

  const greeting = greetingFor(clock.hour)
  const nToday = view.todayCitas.length
  const subtitle = loading
    ? 'Preparando el resumen del día…'
    : error
      ? 'Resumen de la actividad de la clínica.'
      : nToday === 0
        ? 'No hay citas programadas para hoy.'
        : `Hay ${plural(nToday, 'cita programada', 'citas programadas')} para hoy.`

  const header = (
    <PageHeader
      title={greeting}
      subtitle={subtitle}
      actions={
        <>
          <Button icon="users" onClick={() => navigate('pacientes', { nuevo: 1 })}>Registrar paciente</Button>
          <Button variant="primary" icon="plus" onClick={() => navigate('citas', { nueva: 1 })}>Nueva cita</Button>
        </>
      }
    />
  )

  if (error) {
    return (
      <>
        {header}
        <Card>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      </>
    )
  }

  const pending = nToday - view.todayAttended
  const longToday = capitalize(fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' }))

  // ----- agenda body: today → upcoming fallback → empty -----
  let agenda
  if (loading) {
    agenda = <ListSkeleton rows={4} />
  } else if (nToday > 0) {
    agenda = (
      <div className="list" role="list" aria-label="Citas de hoy">
        {view.todayCitas.map((c) => <AgendaItem key={c.idCita} cita={c} />)}
      </div>
    )
  } else if (view.upcoming.length > 0) {
    const n = view.upcoming.length
    agenda = (
      <>
        <div className="toolbar">
          <Icon name="calendar" size={16} className="faint" />
          <div>
            <div className="cell-main">Próximas citas</div>
            <div className="cell-sub">
              No hay citas para hoy. {n === 1 ? 'Esta es la siguiente en la agenda.' : `Estas son las ${n} siguientes en la agenda.`}
            </div>
          </div>
        </div>
        <div className="list" role="list" aria-label="Próximas citas">
          {view.upcoming.map((c) => <UpcomingItem key={c.idCita} cita={c} />)}
        </div>
      </>
    )
  } else {
    agenda = (
      <EmptyState
        icon="calendar"
        title="Agenda despejada"
        text="No hay citas para hoy ni próximas en la agenda. Programe una cita para empezar a organizar el día."
        action={<Button variant="primary" icon="plus" onClick={() => navigate('citas', { nueva: 1 })}>Nueva cita</Button>}
      />
    )
  }

  // ----- specialty workload body -----
  let workload
  if (loading) {
    workload = <LoadSkeleton />
  } else if (view.load.length === 0) {
    workload = (
      <EmptyState
        icon="layers"
        title="Sin especialidades"
        text="Registre las especialidades médicas para ver cómo se distribuyen las citas."
        action={<Button size="sm" icon="plus" onClick={() => navigate('especialidades')}>Ir a especialidades</Button>}
      />
    )
  } else {
    const shown = view.load.slice(0, MAX_SPECIALTIES)
    const hidden = view.load.length - shown.length
    workload = (
      <>
        <div className="card-body stack" style={{ gap: 16 }}>
          {shown.map((e) => {
            const pct = view.maxLoad ? Math.max(4, Math.round((e.citas / view.maxLoad) * 100)) : 0
            return (
              <div key={e.id}>
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <div className="row" style={{ gap: 8, minWidth: 0 }}>
                    <span className="cell-main">{e.nombre}</span>
                    <span className="cell-sub" style={{ whiteSpace: 'nowrap' }}>· {e.medicos ? plural(e.medicos, 'médico', 'médicos') : 'sin médicos'}</span>
                  </div>
                  <span className="num" style={{ whiteSpace: 'nowrap' }}>
                    <strong>{e.citas}</strong> <span className="muted">{e.citas === 1 ? 'cita' : 'citas'}</span>
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${e.citas ? pct : 0}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        {hidden > 0 && (
          <div className="card-foot">
            <LinkAction onClick={() => navigate('especialidades')}>
              Ver {plural(hidden, 'especialidad más', 'especialidades más')}
            </LinkAction>
          </div>
        )}
      </>
    )
  }

  // ----- recent consultations body -----
  let recent
  if (loading) {
    recent = <ListSkeleton rows={3} lead={false} />
  } else if (view.recent.length === 0) {
    recent = (
      <EmptyState
        icon="clipboard"
        title="Sin consultas registradas"
        text="Cuando se documente la atención de una cita, el diagnóstico aparecerá aquí."
        action={<Button size="sm" onClick={() => navigate('consultas')}>Ir a consultas</Button>}
      />
    )
  } else {
    recent = (
      <div className="list" role="list" aria-label="Consultas recientes">
        {view.recent.map((c) => (
          <div className="list-item" role="listitem" key={c.idConsulta}>
            <div style={{ flex: 1, minWidth: 0 }} title={c.diagnostico}>
              <Person person={c.paciente} sub={c.diagnostico || 'Sin diagnóstico'} />
            </div>
            <span className="cell-sub num" style={{ whiteSpace: 'nowrap' }}>{shortDate(c.cita?.fecha, today)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {header}

      <section className="grid grid-4" aria-label="Indicadores principales">
        <StatCard
          label="Citas de hoy"
          icon="calendar"
          tone="blue"
          loading={loading}
          value={nToday}
          foot={loading ? footSkeleton : nToday ? `${plural(view.todayAttended, 'atendida', 'atendidas')} · ${plural(pending, 'pendiente', 'pendientes')}` : 'Sin citas para hoy'}
        />
        <StatCard
          label="Próximos 7 días"
          icon="clock"
          tone="brand"
          loading={loading}
          value={view.nextWeek}
          foot={loading ? footSkeleton : `Hasta el ${fmtDate(view.weekEnd, { day: 'numeric', month: 'long' })}`}
        />
        <StatCard
          label="Pacientes registrados"
          icon="users"
          tone="green"
          loading={loading}
          value={view.totalPacientes}
          foot={loading ? footSkeleton : view.totalPacientes ? plural(view.activePatients, 'con cita activa', 'con citas activas') : 'Sin pacientes registrados'}
        />
        <StatCard
          label="Médicos activos"
          icon="stethoscope"
          tone="violet"
          loading={loading}
          value={view.totalDoctores}
          foot={loading ? footSkeleton : view.totalDoctores ? `en ${plural(view.specialtiesInUse, 'especialidad', 'especialidades')}` : 'Sin médicos registrados'}
        />
      </section>

      <div className="grid grid-main">
        <Card title="Agenda de hoy" subtitle={longToday} action={<LinkAction onClick={() => navigate('citas')}>Ver todas</LinkAction>}>
          {agenda}
        </Card>

        <div className="stack" style={{ gap: 16 }}>
          <Card
            title="Carga por especialidad"
            subtitle="Citas asignadas según el área del médico"
            action={<LinkAction onClick={() => navigate('especialidades')}>Ver todas</LinkAction>}
          >
            {workload}
          </Card>
          <Card
            title="Consultas recientes"
            subtitle="Últimos diagnósticos registrados"
            action={<LinkAction onClick={() => navigate('consultas')}>Ver todas</LinkAction>}
          >
            {recent}
          </Card>
        </div>
      </div>
    </>
  )
}
