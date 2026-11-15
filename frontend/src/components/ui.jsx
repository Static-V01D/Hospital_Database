/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Icon from '../icons.jsx'
import { api, initials } from '../api.js'

// ---------------- data ----------------
// Loads several resources at once: const { data, loading, error, reload } = useData(['citas', 'pacientes'])
export function useData(keys) {
  const keyStr = keys.join(',')
  const [state, setState] = useState({ data: {}, loading: true, error: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const ks = keyStr.split(',')
      const results = await Promise.all(ks.map((k) => api.list(k)))
      setState({ data: Object.fromEntries(ks.map((k, i) => [k, results[i] ?? []])), loading: false, error: null })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'No se pudo cargar la información' }))
    }
  }, [keyStr])
  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}

export const byId = (list = [], idField) => Object.fromEntries(list.map((x) => [x[idField], x]))

// ---------------- toast ----------------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((xs) => [...xs, { id, message, type }])
    setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="ti"><Icon name={t.type === 'error' ? 'x' : 'check'} size={13} strokeWidth={2.5} /></span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------------- primitives ----------------
export function Button({ variant, size, icon, children, className = '', ...rest }) {
  const cls = ['btn', variant && `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, danger, ...rest }) {
  return (
    <button type="button" className={`btn btn-icon${danger ? ' danger' : ''}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  )
}

export function Badge({ tone, dot, children }) {
  return <span className={`badge ${tone || ''}`}>{dot && <span className="dot" />}{children}</span>
}

const hash = (s = '') => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
export function Avatar({ person, size }) {
  const name = person ? `${person.nombre}${person.apellido}` : ''
  return <span className={`avatar c${hash(name) % 6} ${size || ''}`}>{initials(person)}</span>
}

export function Person({ person, sub, size }) {
  return (
    <div className="person">
      <Avatar person={person} size={size} />
      <div>
        <div className="cell-main">{person ? `${person.nombre} ${person.apellido}` : 'Desconocido'}</div>
        {sub && <div className="cell-sub">{sub}</div>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, action, children, className = '', bodyClass }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {bodyClass === undefined ? children : <div className={bodyClass}>{children}</div>}
    </section>
  )
}

export function StatCard({ label, value, icon, tone, foot, loading }) {
  return (
    <div className="card stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone || ''}`}><Icon name={icon} size={18} /></span>
      </div>
      {loading ? <div className="skeleton" style={{ height: 28, width: 64 }} /> : <div className="stat-value">{value}</div>}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…' }) {
  return (
    <label className="search">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" size={16} />
      <input className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'search', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <div className="empty-title">{title}</div>
      {text && <p className="empty-text">{text}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon="alert"
      title="No se pudo cargar la información"
      text={message}
      action={onRetry && <Button icon="activity" onClick={onRetry}>Reintentar</Button>}
    />
  )
}

// ---------------- form fields ----------------
export function Field({ label, required, hint, error, children }) {
  return (
    <label className="field">
      <span className="label">{label}{required && <span className="req">*</span>}</span>
      {children}
      {error ? <span className="error-text">{error}</span> : hint && <span className="hint">{hint}</span>}
    </label>
  )
}

// ---------------- table ----------------
// columns: [{ key, header, render?(row), className?, hideSm? }]
export function DataTable({ columns, rows, rowKey, loading, empty, onRowClick, actions, footer }) {
  if (loading) {
    return (
      <div className="table-wrap">
        <table className="table">
          <thead><tr>{columns.map((c) => <th key={c.key} className={c.hideSm ? 'hide-sm' : ''}>{c.header}</th>)}{actions && <th />}</tr></thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{columns.map((c) => <td key={c.key} className={c.hideSm ? 'hide-sm' : ''}><div className="skeleton" style={{ width: `${50 + ((i * 17 + c.key.length * 7) % 40)}%` }} /></td>)}{actions && <td />}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (!rows.length) return empty
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} className={[c.className, c.hideSm && 'hide-sm'].filter(Boolean).join(' ')}>{c.header}</th>)}
              {actions && <th className="actions"><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[rowKey]} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={[c.className, c.hideSm && 'hide-sm'].filter(Boolean).join(' ')}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>
                ))}
                {actions && (
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <div className="actions-inner">{actions(r)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="table-foot">{footer}</div>}
    </>
  )
}

// ---------------- modal ----------------
export function Modal({ open, onClose, title, subtitle, children, footer, size }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => ref.current?.querySelector('input, select, textarea, button.btn-primary')?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size || ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// Form modal: handles submit + busy state. onSubmit should throw on failure.
export function FormModal({ open, onClose, title, subtitle, submitLabel = 'Guardar', onSubmit, children, size }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => { if (open) setError(null) }, [open])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit()
    } catch (err) {
      setError(err.message || 'Ocurrió un error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="modal-form" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</Button>
        </>
      }
    >
      <form id="modal-form" className="form" onSubmit={submit} noValidate={false}>
        {error && <div className="banner" style={{ background: 'var(--red-bg)', borderColor: '#f5cdd0', color: '#8a1f25' }}><Icon name="alert" size={16} />{error}</div>}
        {children}
      </form>
    </Modal>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar' }) {
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={go} disabled={busy}>{busy ? 'Eliminando…' : confirmLabel}</Button>
        </>
      }
    >
      <div className="confirm-icon"><Icon name="trash" size={20} /></div>
      <h3 style={{ fontSize: 16, marginBottom: 6 }}>{title}</h3>
      <p className="muted">{message}</p>
    </Modal>
  )
}
