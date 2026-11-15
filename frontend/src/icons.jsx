// Minimal stroke icon set (24x24, 1.75 stroke) — no external dependency.
const P = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .7 3.5 2.8 3.5 5.7" /></>,
  stethoscope: <><path d="M5 3v5a5 5 0 0 0 10 0V3" /><path d="M10 13v2a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="11" r="2" /><path d="M4 3h2M14 3h2" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h4" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.01" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17v.01" /></>,
  heart: <path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9C20 15.4 12 20 12 20Z" />,
  activity: <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />,
}

export default function Icon({ name, size = 18, className, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...rest}>
      {P[name]}
    </svg>
  )
}

// Marca NOVAMED: cruz médica (medicina) dentro de una red hexagonal de nodos
// conectados (innovación), en el mismo color de los botones (--brand).
// Mismo dibujo que public/favicon.svg.
export function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="48" height="48" rx="12" fill="var(--brand)" />
      <path d="M24 7.5 38.29 15.75v16.5L24 40.5 9.71 32.25v-16.5z" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.8" strokeLinejoin="round" />
      <g fill="#fff">
        <circle cx="24" cy="7.5" r="2.9" />
        <circle cx="38.29" cy="32.25" r="2.9" />
        <circle cx="9.71" cy="32.25" r="2.9" />
        <circle cx="38.29" cy="15.75" r="2" />
        <circle cx="24" cy="40.5" r="2" />
        <circle cx="9.71" cy="15.75" r="2" />
        <path d="M21 15.5h6v5.5h5.5v6H27v5.5h-6V27h-5.5v-6H21z" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
