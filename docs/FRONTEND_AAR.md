# Frontend redesign — after-action report (resume context)

Goal: professional clinical admin UI ("Clínica Central") for the ASP.NET + MySQL hospital API. Spanish UI, no new npm deps.

## Done
- `frontend/src/index.css` — full design system (tokens, layout, card/table/form/modal/badge/toast, responsive ≤860px/≤560px). Font: Plus Jakarta Sans (Google Fonts in `index.html`). Brand teal `#0b6b74`.
- `src/api.js` — fetch client via Vite proxy `/api` → `http://localhost:5198` (see `vite.config.js`). **Falls back to in-memory demo data** if backend unreachable (banner + amber "Modo demostración" pill). Helpers: fullName, fmtDate, fmtTime, fmtPhone, age, todayISO, dateOnly.
- `src/icons.jsx` — inline SVG icon set + Logo. `src/components/ui.jsx` — useData, byId, toast, Button, DataTable, Modal, FormModal, ConfirmDialog, StatCard, etc.
- `src/App.jsx` — sidebar + topbar shell, hash router (`#/citas?nueva=1`). Pages get `{query, navigate}`.
- Template assets removed (App.css, assets/, public/icons.svg).
- Pages in `src/pages/`: Dashboard, Appointments(citas), Patients, Doctors, Consultations, Specialties.

## API facts that matter
- JSON camelCase; fecha `"YYYY-MM-DDT00:00:00"`, hora `"HH:MM:SS"`. Send fecha `YYYY-MM-DD`, hora `HH:MM:00`.
- **Pacientes has no PUT** → UI offers create/delete only. GET /consultas returns no nested cita → join client-side.
- CORS allows only `http://localhost:5173` (proxy makes this moot in dev).

## Verify / resume
```
cd frontend && npm install && npx eslint src && npm run build && npm run dev
```
Preview config: `.claude/launch.json` → "frontend" (port 5173).

## Final status (2026-11-13)
- All 6 pages built; `eslint src` clean; `npm run build` OK.
- Browser-verified in demo mode: desktop 1440px (all pages), create-cita flow, 375px mobile (Pacientes, drawer menu).
- Review fixes applied: writes never fall back to demo (real 5xx/network errors surface as toasts); age() local-date fix; `nuevo` query key fix.
- `.claude/launch.json` preview fails on this Mac (EPERM on ~/Documents for npm) → run `npx vite` from `frontend/` instead.

## Open items / next steps
- NOT tested against the real backend + MySQL (not installed here). Check the POST/PUT bodies against the live API.
- Not reviewed: the UX and React-correctness review passes timed out (only the API-contract review finished).
- Backend gaps: no PUT /api/Pacientes (patients can't be edited); no ProblemDetails, so DB errors show a generic message.
- Committed as `7393f29`, then a per-file React/UX review → verify → fix pass was committed on top (see `git log`). That pass fixed:
  - demo dates now use the local date (the dashboard's "today" was empty in the evening)
  - Spanish inline form errors instead of browser tooltips
  - patient file can be opened with the keyboard; dialogs have accessible names and focus
  - honest delete-error messages; dashboard date refreshes; mobile row actions
- Lint and build are clean; checked in the browser: dashboard in the evening, empty-submit errors on Citas, Consultas page.
- Consultas table fixed: Diagnóstico wraps to 2 lines. Observaciones is hidden at ≤1200px via the new DataTable `hideMd` column option (`.hide-md` in index.css) and is still shown in the detail view. Checked at 1440, 1000 and 375px with no overflow.
- Remaining: re-check everything against the live API once MySQL is running.
