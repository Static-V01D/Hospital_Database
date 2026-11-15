import { useEffect, useState } from 'react'
import Icon, { Logo } from './icons.jsx'
import { isDemo, onModeChange } from './api.js'
import Dashboard from './pages/Dashboard.jsx'
import Appointments from './pages/Appointments.jsx'
import Patients from './pages/Patients.jsx'
import Doctors from './pages/Doctors.jsx'
import Consultations from './pages/Consultations.jsx'
import Specialties from './pages/Specialties.jsx'

// Hash router: #/citas?nueva=1  →  { page: 'citas', query: URLSearchParams }
const ROUTES = [
  { page: 'panel', label: 'Panel general', icon: 'dashboard', component: Dashboard, group: 'Principal' },
  { page: 'citas', label: 'Citas', icon: 'calendar', component: Appointments, group: 'Principal' },
  { page: 'pacientes', label: 'Pacientes', icon: 'users', component: Patients, group: 'Principal' },
  { page: 'consultas', label: 'Consultas', icon: 'clipboard', component: Consultations, group: 'Clínica' },
  { page: 'doctores', label: 'Médicos', icon: 'stethoscope', component: Doctors, group: 'Clínica' },
  { page: 'especialidades', label: 'Especialidades', icon: 'layers', component: Specialties, group: 'Clínica' },
]

const parseHash = () => {
  const [path, qs] = window.location.hash.replace(/^#\/?/, '').split('?')
  const page = ROUTES.some((r) => r.page === path) ? path : 'panel'
  return { page, query: new URLSearchParams(qs || '') }
}

function navigate(page, params) {
  const qs = params ? `?${new URLSearchParams(params)}` : ''
  window.location.hash = `/${page}${qs}`
}

function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function useDemo() {
  const [demo, setDemo] = useState(isDemo)
  useEffect(() => onModeChange(setDemo), [])
  return demo
}

export default function App() {
  const route = useRoute()
  const demo = useDemo()
  const [menuOpen, setMenuOpen] = useState(false)
  const current = ROUTES.find((r) => r.page === route.page)
  const Page = current.component

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${current.label} · Clínica Central`
  }, [route.page, current.label])

  const groups = [...new Set(ROUTES.map((r) => r.group))]
  const todayRaw = new Date().toLocaleDateString('es-PR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  return (
    <div className="app">
      <aside className={`sidebar${menuOpen ? ' open' : ''}`} aria-label="Navegación principal">
        <a className="brand" href="#/panel" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo size={34} />
          <div>
            <div className="brand-name">Clínica Central</div>
            <div className="brand-sub">Gestión hospitalaria</div>
          </div>
        </a>
        {groups.map((g) => (
          <div key={g}>
            <div className="nav-label">{g}</div>
            <nav className="nav">
              {ROUTES.filter((r) => r.group === g).map((r) => (
                <a key={r.page} href={`#/${r.page}`} className={`nav-item${r.page === route.page ? ' active' : ''}`} aria-current={r.page === route.page ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                  <Icon name={r.icon} size={18} />
                  {r.label}
                </a>
              ))}
            </nav>
          </div>
        ))}
        <div className="sidebar-foot">
          <div className="status-pill" title={demo ? 'El servidor no responde; se muestran datos de ejemplo.' : 'Conectado a la API'}>
            <span className={`status-dot${demo ? ' demo' : ''}`} />
            {demo ? 'Modo demostración' : 'Sistema en línea'}
          </div>
        </div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn-icon menu-btn" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <div className="crumbs">
            <span className="hide-sm">Clínica Central</span>
            <Icon name="chevronRight" size={14} className="hide-sm" />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{today}</span>
            <div className="user-chip">
              <span className="avatar sm c0">AD</span>
              <div className="meta">
                <div className="who">Administración</div>
                <div className="role">Recepción</div>
              </div>
            </div>
          </div>
        </header>

        <main className="content">
          {demo && (
            <div className="banner" role="note">
              <Icon name="info" size={18} />
              <span>
                No hay conexión con la API — se muestran <strong>datos de demostración</strong> y los cambios no se guardarán.
                Inicie el backend con <code>dotnet run</code> en <code>backend/</code> y recargue la página.
              </span>
            </div>
          )}
          <Page key={route.page} query={route.query} navigate={navigate} />
        </main>
      </div>
    </div>
  )
}
