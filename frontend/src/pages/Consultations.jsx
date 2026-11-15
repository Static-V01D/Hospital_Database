/*
 * Consultas — registros clínicos (diagnóstico y observaciones) de las citas atendidas.
 * Lista con búsqueda, detalle, registro/edición (una consulta por cita) y eliminación.
 *
 * Parámetros de URL:
 *   #/consultas?nueva=1            abre el formulario de registro
 *   #/consultas?nueva=1&cita=ID    abre el formulario con esa cita preseleccionada
 *   #/consultas?cita=ID            abre el detalle de la consulta de esa cita
 */
import { useCallback, useMemo, useState } from 'react'
import Icon from '../icons.jsx'
import { api, age, dateOnly, fmtDate, fmtTime, fullName, todayISO } from '../api.js'
import {
  useData, byId, useToast, Button, IconButton, Person, PageHeader, Card,
  SearchInput, EmptyState, ErrorState, Field, DataTable, Modal, FormModal, ConfirmDialog,
} from '../components/ui.jsx'

const RESOURCE_KEYS = ['consultas', 'citas', 'pacientes', 'doctores', 'especialidades']
const EMPTY_FORM = { mode: 'create', idCita: '', diagnostico: '', observaciones: '' }
const LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
// Two-line clamp that wraps on word boundaries (long single words still break), so text stays
// readable at medium widths instead of collapsing to a few letters. Full text is in the title tooltip.
const CLAMP_2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }
const DIAG_STYLE = { ...CLAMP_2, minWidth: 160, maxWidth: 320 }
const OBS_STYLE = { ...CLAMP_2, minWidth: 140, maxWidth: 260 }

// Accent- and case-insensitive search ("perez" matches "Pérez").
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const sortKey = (cita) => (cita ? `${dateOnly(cita.fecha)}T${cita.hora ?? ''}` : '')
const nameOr = (person, fallback) => (person ? fullName(person) : fallback)

// "12 nov 2026 · 10:00 a. m. — Luis Pérez (Dr. Carlos Rodríguez)"
function citaLabel(cita, maps) {
  const paciente = maps.pacientes[cita.idPaciente]
  const doctor = maps.doctores[cita.idDoctor]
  return `${fmtDate(cita.fecha)} · ${fmtTime(cita.hora)} — ${nameOr(paciente, 'Paciente desconocido')}${doctor ? ` (Dr. ${fullName(doctor)})` : ''}`
}

export default function Consultations({ query, navigate }) {
  const { data, loading, error, reload } = useData(RESOURCE_KEYS)
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(() =>
    query.get('nueva') === '1' ? { ...EMPTY_FORM, idCita: query.get('cita') ?? '' } : null,
  )
  const [errors, setErrors] = useState({})
  const [viewing, setViewing] = useState(() =>
    query.get('nueva') !== '1' && query.get('cita') ? { idCita: Number(query.get('cita')) } : null,
  )
  const [deleting, setDeleting] = useState(null)

  const ready = Boolean(data.consultas)

  // ---------- derived data ----------
  const maps = useMemo(() => ({
    citas: byId(data.citas, 'idCita'),
    pacientes: byId(data.pacientes, 'idPaciente'),
    doctores: byId(data.doctores, 'idDoctor'),
    especialidades: byId(data.especialidades, 'idEspecialidad'),
  }), [data.citas, data.pacientes, data.doctores, data.especialidades])

  // Consultas joined client-side with cita → paciente / médico → especialidad, newest cita first.
  const rows = useMemo(() => (data.consultas ?? [])
    .map((c) => {
      const cita = maps.citas[c.idCita]
      const paciente = cita ? maps.pacientes[cita.idPaciente] : undefined
      const doctor = cita ? maps.doctores[cita.idDoctor] : undefined
      const especialidad = doctor ? maps.especialidades[doctor.idEspecialidad] : undefined
      return {
        ...c, cita, paciente, doctor, especialidad,
        key: sortKey(cita),
        haystack: norm([fullName(paciente), fullName(doctor), c.diagnostico, c.observaciones].join(' ')),
      }
    })
    .sort((a, b) => b.key.localeCompare(a.key) || b.idConsulta - a.idConsulta), [data.consultas, maps])

  const filtered = useMemo(() => {
    const terms = norm(search).split(/\s+/).filter(Boolean)
    if (!terms.length) return rows
    return rows.filter((r) => terms.every((t) => r.haystack.includes(t)))
  }, [rows, search])

  // Citas that can receive a consulta: no consulta yet and dated today or earlier (most recent first).
  // Future citas have not been attended, so they are counted but never offered.
  const citaOptions = useMemo(() => {
    const taken = new Set((data.consultas ?? []).map((c) => c.idCita))
    const today = todayISO()
    const free = (data.citas ?? []).filter((c) => !taken.has(c.idCita))
    const pending = free.filter((c) => dateOnly(c.fecha) <= today)
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
      .map((c) => ({ value: String(c.idCita), label: citaLabel(c, maps) }))
    const upcoming = free.length - pending.length
    return { pending, upcoming, taken, ids: new Set(pending.map((o) => o.value)) }
  }, [data.consultas, data.citas, maps])

  const detail = useMemo(() => {
    if (!viewing) return null
    return rows.find((r) => (viewing.idConsulta ? r.idConsulta === viewing.idConsulta : r.idCita === viewing.idCita)) ?? null
  }, [viewing, rows])

  // ---------- open / close (stable callbacks: Modal re-runs its focus effect when onClose changes) ----------
  // replaceState (not navigate) so Cancel/Close does not leave a "?nueva=1" entry for Back to land on.
  const clearQuery = useCallback(() => {
    if (window.location.hash.includes('?')) window.history.replaceState(window.history.state, '', '#/consultas')
  }, [])
  const closeForm = useCallback(() => { setForm(null); clearQuery() }, [clearQuery])
  const closeDetail = useCallback(() => { setViewing(null); clearQuery() }, [clearQuery])
  const closeDelete = useCallback(() => setDeleting(null), [])

  const openCreate = () => {
    setErrors({})
    setForm({ ...EMPTY_FORM })
  }
  const openEdit = (row) => {
    setViewing(null)
    setErrors({})
    setForm({
      mode: 'edit',
      idConsulta: row.idConsulta,
      idCita: String(row.idCita),
      diagnostico: row.diagnostico ?? '',
      observaciones: row.observaciones ?? '',
    })
  }
  const askDelete = (row) => {
    closeDetail()
    setDeleting(row)
  }
  const setField = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((es) => ({ ...es, [key]: undefined }))
  }

  // ---------- mutations ----------
  const isEdit = form?.mode === 'edit'
  const noCitas = ready && !isEdit && citaOptions.ids.size === 0
  const selectedTaken = Boolean(form && !isEdit && ready && form.idCita &&
    !citaOptions.ids.has(form.idCita) && citaOptions.taken.has(Number(form.idCita)))
  const selectedCita = form && !isEdit && ready && form.idCita ? maps.citas[Number(form.idCita)] : undefined
  const selectedFuture = Boolean(selectedCita && !selectedTaken && dateOnly(selectedCita.fecha) > todayISO())

  const submit = async () => {
    const errs = {}
    if (!isEdit && !citaOptions.ids.has(form.idCita)) {
      const cita = maps.citas[Number(form.idCita)]
      errs.idCita = citaOptions.taken.has(Number(form.idCita)) ? 'Esta cita ya tiene una consulta registrada.'
        : cita && dateOnly(cita.fecha) > todayISO() ? 'Solo puede registrar consultas de citas ya atendidas.'
          : 'Seleccione la cita atendida.'
    }
    if (!form.diagnostico.trim()) errs.diagnostico = 'Escriba el diagnóstico.'
    if (!form.observaciones.trim()) errs.observaciones = 'Escriba las observaciones. Si no aplica, indique «Ninguna».'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const body = {
      idCita: Number(form.idCita),
      diagnostico: form.diagnostico.trim(),
      observaciones: form.observaciones.trim(),
    }
    try {
      if (isEdit) await api.update('consultas', form.idConsulta, { idConsulta: form.idConsulta, ...body })
      else await api.create('consultas', body)
    } catch (e) {
      // FormModal shows this in its banner; no toast, so the error appears once.
      throw new Error(`No se pudo guardar la consulta: ${e.message}`)
    }
    toast(isEdit ? 'Cambios guardados' : 'Consulta registrada', 'success')
    closeForm()
    reload()
  }

  const confirmDelete = async () => {
    const row = deleting
    try {
      await api.remove('consultas', row.idConsulta)
      toast('Consulta eliminada', 'success')
      reload()
    } catch (e) {
      toast(`No se pudo eliminar la consulta: ${e.message}`, 'error')
    } finally {
      setDeleting(null)
    }
  }

  // ---------- table ----------
  const columns = [
    {
      key: 'paciente',
      header: 'Paciente',
      render: (r) => (
        <Person person={r.paciente} sub={r.cita ? fmtDate(r.cita.fecha) : 'Cita no encontrada'} />
      ),
    },
    {
      key: 'medico',
      header: 'Médico',
      hideSm: true,
      render: (r) => (
        <>
          <div style={{ whiteSpace: 'nowrap' }}>{nameOr(r.doctor, '—')}</div>
          <div className="cell-sub">{r.especialidad?.nombre ?? 'Sin especialidad'}</div>
        </>
      ),
    },
    {
      key: 'diagnostico',
      header: 'Diagnóstico',
      render: (r) => <div className="cell-main" style={DIAG_STYLE} title={r.diagnostico}>{r.diagnostico || '—'}</div>,
    },
    {
      key: 'observaciones',
      header: 'Observaciones',
      hideSm: true,
      hideMd: true, // shown in the detail modal; keeps row actions on screen at medium widths
      render: (r) => <div className="muted" style={OBS_STYLE} title={r.observaciones}>{r.observaciones || '—'}</div>,
    },
  ]

  const countLabel = filtered.length === rows.length
    ? `${rows.length} ${rows.length === 1 ? 'consulta' : 'consultas'}`
    : `${filtered.length} de ${rows.length}`

  const emptyState = rows.length === 0 ? (
    <EmptyState
      icon="clipboard"
      title="Aún no hay consultas registradas"
      text="Cuando un paciente sea atendido, registre aquí el diagnóstico y las observaciones de su cita."
      action={<Button variant="primary" icon="plus" onClick={openCreate}>Registrar consulta</Button>}
    />
  ) : (
    <EmptyState
      icon="search"
      title="Sin resultados"
      text={`Ninguna consulta coincide con «${search.trim()}». Pruebe con el nombre del paciente, del médico o parte del diagnóstico.`}
      action={<Button onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
    />
  )

  const editCita = isEdit ? maps.citas[Number(form.idCita)] : null

  return (
    <>
      <PageHeader
        title="Consultas"
        subtitle="Registros clínicos de las citas atendidas."
        actions={<Button variant="primary" icon="plus" onClick={openCreate}>Registrar consulta</Button>}
      />

      <Card>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            <div className="toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Paciente, médico, diagnóstico…" />
              <span className="spacer hide-sm" />
              {ready && citaOptions.pending.length > 0 && (
                <button type="button" className="badge amber" style={{ border: 0 }} onClick={openCreate} title="Registrar una consulta">
                  <span className="dot" />
                  {citaOptions.pending.length} {citaOptions.pending.length === 1 ? 'cita pendiente de registro' : 'citas pendientes de registro'}
                  <Icon name="arrowRight" size={12} />
                </button>
              )}
              {ready && <span className="muted num">{countLabel}</span>}
            </div>
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey="idConsulta"
              loading={loading && !ready}
              empty={emptyState}
              onRowClick={(r) => setViewing({ idConsulta: r.idConsulta })}
              actions={(r) => (
                <>
                  <span className="row hide-sm" style={{ gap: 2 }}>
                    <IconButton icon="edit" label="Editar consulta" onClick={() => openEdit(r)} />
                    <IconButton icon="trash" label="Eliminar consulta" danger onClick={() => askDelete(r)} />
                  </span>
                  <IconButton icon="chevronRight" label="Ver detalle" onClick={() => setViewing({ idConsulta: r.idConsulta })} />
                </>
              )}
              footer={
                <>
                  <span>Ordenadas por fecha de la cita, de la más reciente a la más antigua.</span>
                  <span className="hide-sm">Seleccione una fila para ver el detalle.</span>
                </>
              }
            />
          </>
        )}
      </Card>

      {/* ---------- detail ---------- */}
      <Modal
        open={Boolean(detail)}
        onClose={closeDetail}
        title="Detalle de la consulta"
        subtitle={detail ? `${nameOr(detail.paciente, 'Paciente desconocido')} · ${fmtDate(detail.cita?.fecha)}` : undefined}
        footer={detail && (
          <>
            <IconButton icon="trash" label="Eliminar consulta" danger style={{ marginRight: 'auto' }} onClick={() => askDelete(detail)} />
            <Button onClick={closeDetail}>Cerrar</Button>
            <Button variant="primary" icon="edit" onClick={() => openEdit(detail)}>Editar</Button>
          </>
        )}
      >
        {detail && (
          <div className="stack" style={{ gap: 20 }}>
            <dl className="dl">
              <dt>Paciente</dt>
              <dd>
                <Person
                  person={detail.paciente}
                  size="sm"
                  sub={age(detail.paciente?.fechaNacimiento) != null ? `${age(detail.paciente.fechaNacimiento)} años` : undefined}
                />
              </dd>
              <dt>Médico</dt>
              <dd>{detail.doctor ? `Dr. ${fullName(detail.doctor)}` : '—'}</dd>
              <dt>Especialidad</dt>
              <dd>{detail.especialidad?.nombre ?? '—'}</dd>
              <dt>Fecha y hora</dt>
              <dd>{detail.cita ? `${cap(fmtDate(detail.cita.fecha, LONG_DATE))} · ${fmtTime(detail.cita.hora)}` : '—'}</dd>
              <dt>Motivo de la cita</dt>
              <dd>{detail.cita?.motivo || '—'}</dd>
            </dl>
            <section style={{ borderTop: '1px solid var(--line-2)', paddingTop: 16 }}>
              <h3 className="label">Diagnóstico</h3>
              <p className="cell-main" style={{ marginTop: 6, fontSize: 15, whiteSpace: 'pre-wrap' }}>{detail.diagnostico || '—'}</p>
            </section>
            <section>
              <h3 className="label">Observaciones</h3>
              <p style={{ marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.observaciones || 'Sin observaciones.'}</p>
            </section>
          </div>
        )}
      </Modal>

      {/* ---------- create: nothing to register ---------- */}
      <Modal
        open={Boolean(form) && noCitas}
        onClose={closeForm}
        title="Registrar consulta"
        subtitle="Documente el resultado de una cita atendida."
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>Cancelar</Button>
            <Button variant="primary" icon="calendar" onClick={() => navigate('citas', { nueva: 1 })}>Programar cita</Button>
          </>
        }
      >
        <EmptyState
          icon="calendar"
          title="No hay citas pendientes de registro"
          text={citaOptions.upcoming > 0
            ? `Las citas de hoy y anteriores ya tienen consulta. ${citaOptions.upcoming === 1 ? 'La próxima cita podrá registrarse' : `Las ${citaOptions.upcoming} próximas citas podrán registrarse`} una vez atendida${citaOptions.upcoming === 1 ? '' : 's'}.`
            : 'Todas las citas ya tienen una consulta. Programe una cita para poder registrar su resultado.'}
        />
      </Modal>

      {/* ---------- create / edit ---------- */}
      <FormModal
        open={Boolean(form) && !noCitas}
        onClose={closeForm}
        title={isEdit ? 'Editar consulta' : 'Registrar consulta'}
        subtitle={isEdit ? 'Actualice el diagnóstico o las observaciones.' : 'Documente el resultado de una cita atendida.'}
        submitLabel={isEdit ? 'Guardar cambios' : 'Registrar consulta'}
        onSubmit={submit}
      >
        {form && (
          <>
            {isEdit ? (
              <Field label="Cita" hint="La cita asociada no se puede cambiar.">
                <select className="select" value={form.idCita} disabled style={{ background: 'var(--surface-2)', cursor: 'not-allowed' }}>
                  <option value={form.idCita}>{editCita ? citaLabel(editCita, maps) : `Cita #${form.idCita}`}</option>
                </select>
              </Field>
            ) : !ready ? (
              <Field label="Cita" required>
                <select className="select" value="" disabled>
                  <option value="">Cargando citas…</option>
                </select>
              </Field>
            ) : (
              <>
                {selectedTaken && (
                  <div className="banner" role="note">
                    <Icon name="info" size={16} />
                    <span>La cita indicada ya tiene una consulta registrada.</span>
                    <button
                      type="button"
                      className="link-btn"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => { const idCita = Number(form.idCita); closeForm(); setViewing({ idCita }) }}
                    >
                      Ver consulta
                    </button>
                  </div>
                )}
                {selectedFuture && (
                  <div className="banner" role="note">
                    <Icon name="info" size={16} />
                    <span>
                      La cita indicada es del {fmtDate(selectedCita.fecha)} y aún no se ha atendido. Podrá registrar su consulta ese día.
                    </span>
                  </div>
                )}
                <Field label="Cita" required error={errors.idCita} hint="Solo se muestran citas de hoy o anteriores sin consulta registrada.">
                  <select
                    className={`select${errors.idCita ? ' invalid' : ''}`}
                    value={citaOptions.ids.has(form.idCita) ? form.idCita : ''}
                    onChange={setField('idCita')}
                    aria-invalid={Boolean(errors.idCita)}
                    required
                  >
                    <option value="">Seleccione una cita…</option>
                    <optgroup label={`Pendientes de registro (${citaOptions.pending.length})`}>
                      {citaOptions.pending.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  </select>
                </Field>
              </>
            )}

            <Field label="Diagnóstico" required error={errors.diagnostico}>
              <input
                className={`input${errors.diagnostico ? ' invalid' : ''}`}
                value={form.diagnostico}
                onChange={setField('diagnostico')}
                placeholder="Ej.: Hipertensión arterial controlada"
                maxLength={200}
                aria-invalid={Boolean(errors.diagnostico)}
                autoFocus={isEdit}
                required
              />
            </Field>
            <Field
              label="Observaciones"
              required
              error={errors.observaciones}
              hint="Tratamiento, indicaciones o seguimiento. Si no aplica, escriba «Ninguna»."
            >
              <textarea
                className={`textarea${errors.observaciones ? ' invalid' : ''}`}
                value={form.observaciones}
                onChange={setField('observaciones')}
                placeholder="Ej.: Continuar tratamiento por 30 días y regresar a seguimiento."
                rows={5}
                aria-invalid={Boolean(errors.observaciones)}
                required
              />
            </Field>
          </>
        )}
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="¿Eliminar esta consulta?"
        message={deleting
          ? `Se eliminarán el diagnóstico y las observaciones de la cita de ${nameOr(deleting.paciente, 'este paciente')} del ${fmtDate(deleting.cita?.fecha)}. La cita quedará pendiente de registro. Esta acción no se puede deshacer.`
          : ''}
        confirmLabel="Eliminar consulta"
      />
    </>
  )
}
