/* eslint-disable react-refresh/only-export-components */
import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useEffectEvent, useId, useRef, useState } from 'react'
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
// Errors stay longer (they tend to be longer and need action) and every toast can be dismissed.
const TOAST_MS = { success: 3600, error: 8000 }
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((t) => t.id !== id)), [])
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setItems((xs) => [...xs, { id, message, type }])
    setTimeout(() => dismiss(id), TOAST_MS[type] ?? TOAST_MS.success)
  }, [dismiss])
  const render = (t) => (
    <div key={t.id} className={`toast ${t.type}`}>
      <span className="ti"><Icon name={t.type === 'error' ? 'x' : 'check'} size={13} strokeWidth={2.5} /></span>
      <span className="toast-msg">{t.message}</span>
      <IconButton icon="x" label="Cerrar aviso" onClick={() => dismiss(t.id)} />
    </div>
  )
  // Two persistent live regions: confirmations are polite, errors are assertive.
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        <div className="toast-stack" role="status" aria-live="polite">{items.filter((t) => t.type !== 'error').map(render)}</div>
        <div className="toast-stack" role="alert">{items.filter((t) => t.type === 'error').map(render)}</div>
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

// Toggle group (filters / sort), not tabs: each option is a pressed/unpressed button.
export function Segmented({ options, value, onChange, label = 'Opciones de visualización' }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
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
// Links the error (or hint) text to the control and flags it invalid, unless the caller already did.
export function Field({ label, required, hint, error, children }) {
  const id = useId()
  const msgId = error || hint ? `${id}-msg` : undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        'aria-describedby': children.props['aria-describedby'] ?? msgId,
        'aria-invalid': children.props['aria-invalid'] ?? (error ? true : undefined),
      })
    : children
  return (
    <label className="field">
      <span className="label">{label}{required && <span className="req">*</span>}</span>
      {control}
      {error ? <span id={msgId} className="error-text">{error}</span> : hint && <span id={msgId} className="hint">{hint}</span>}
    </label>
  )
}

// ---------------- table ----------------
// columns: [{ key, header, render?(row), className?, hideSm?, hideMd? }]
// hideSm hides the column at ≤860px, hideMd at ≤1200px (see index.css).
const colCls = (c) => [c.className, c.hideSm && 'hide-sm', c.hideMd && 'hide-md'].filter(Boolean).join(' ') || undefined
export function DataTable({ columns, rows, rowKey, loading, empty, onRowClick, actions, footer }) {
  if (loading) {
    return (
      <div className="table-wrap">
        <table className="table">
          <thead><tr>{columns.map((c) => <th key={c.key} className={colCls(c)}>{c.header}</th>)}{actions && <th />}</tr></thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{columns.map((c) => <td key={c.key} className={colCls(c)}><div className="skeleton" style={{ width: `${50 + ((i * 17 + c.key.length * 7) % 40)}%` }} /></td>)}{actions && <td />}</tr>
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
              {columns.map((c) => <th key={c.key} className={colCls(c)}>{c.header}</th>)}
              {actions && <th className="actions"><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r[rowKey]}
                className={onRowClick ? 'clickable' : ''}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  // Only when the row itself has focus, so Enter/Space on an action button keeps working.
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onRowClick(r)
                  }
                } : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={colCls(c)}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>
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
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const INITIAL_FOCUS = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button.btn-primary:not([disabled]), button.btn-danger:not([disabled])'
// Open modals, topmost last: only the topmost one reacts to Escape / Tab.
const modalStack = []

// labelledBy / describedBy let a dialog without a header title (ConfirmDialog) name itself from its body.
export function Modal({ open, onClose, title, subtitle, children, footer, size, role = 'dialog', labelledBy, describedBy }) {
  const ref = useRef(null)
  const titleId = useId()
  const close = useEffectEvent(() => onClose())
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const token = {}
    modalStack.push(token)
    const onKey = (e) => {
      const el = ref.current
      if (!el || modalStack[modalStack.length - 1] !== token) return
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab') return
      // Keep Tab inside the dialog.
      const items = [...el.querySelectorAll(FOCUSABLE)]
      const active = document.activeElement
      if (!items.length) { e.preventDefault(); el.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const outside = !el.contains(active)
      if (e.shiftKey && (outside || active === first || active === el)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (outside || active === last)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const el = ref.current
      if (el) (el.querySelector('[data-autofocus]') ?? el.querySelector(INITIAL_FOCUS) ?? el).focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      clearTimeout(t)
      modalStack.splice(modalStack.indexOf(token), 1)
      // Return focus to whatever opened the dialog (if it still exists).
      if (opener?.isConnected) opener.focus?.()
    }
  }, [open])
  if (!open) return null
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal ${size || ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        aria-describedby={describedBy}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <div>
            {title && <h2 id={titleId} className="modal-title">{title}</h2>}
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
        {error && <div className="banner error" role="alert"><Icon name="alert" size={16} /><span>{error}</span></div>}
        {children}
      </form>
    </Modal>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar' }) {
  const [busy, setBusy] = useState(false)
  const id = useId()
  const go = async () => {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }
  // The visible heading names the dialog; Cancel gets initial focus so Enter never deletes by accident.
  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      labelledBy={`${id}-title`}
      describedBy={message ? `${id}-msg` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} data-autofocus>Cancelar</Button>
          <Button variant="danger" onClick={go} disabled={busy}>{busy ? 'Eliminando…' : confirmLabel}</Button>
        </>
      }
    >
      <div className="confirm-icon" aria-hidden="true"><Icon name="trash" size={20} /></div>
      <h2 id={`${id}-title`} className="confirm-title">{title}</h2>
      {message && <div id={`${id}-msg`} className="muted">{message}</div>}
    </Modal>
  )
}
