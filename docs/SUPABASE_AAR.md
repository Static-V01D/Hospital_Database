# Migración a Supabase y marca NOVAMED — after-action report

Contexto para retomar el trabajo. Estado al 2026-11-15, rama `main`, subida a GitHub.
El siguiente paso está en [HARDENING_PLAN.md](HARDENING_PLAN.md), que lleva el estado al día: este reporte describe el proyecto justo después de la migración, antes de la fase 0 del plan.

## Qué se hizo

| Commit | Contenido |
|---|---|
| `eb7fcea` | Base de datos movida de MySQL local a Supabase (PostgreSQL). |
| `9b63886` | Clínica renombrada a NOVAMED, logo y favicon nuevos. |

- **Backend:** `MySql.EntityFrameworkCore` → `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.11. `Program.cs` arma la cadena de conexión y añade `GET /api/health`. El contrato JSON no cambió.
- **Base de datos:** proyecto Supabase `Hospital_Database` (ref `tlwxeoegldvwluwwqgmb`, us-east-1, plan gratuito, organización Flowtech). Esquema en `database/schema/init.sql`, aplicado como migración `init_hospital_schema`.
- **Datos de prueba:** `database/seeds/seed.sql`, ya cargado: 10 especialidades, 18 doctores, 60 pacientes, 204 citas (1 oct – 5 dic 2026), 125 consultas. Todo ficticio.
- **Frontend:** solo cambió el nombre y el logo (`Logo` en `src/icons.jsx`, `public/favicon.svg`). El logo usa `--brand` (`#0b6b74`), igual que los botones.

## Cómo correrlo

1. Contraseña de la base de datos, una vez por computadora, desde `backend/`:
   `dotnet user-secrets set "Supabase:DbPassword" "<contraseña>"`
   (se obtiene o reinicia en Supabase Dashboard → Database → Settings). En esta computadora ya está configurada.
2. Backend: `dotnet run --launch-profile http` en `backend/` → http://localhost:5198
3. Frontend: `npm run dev` en `frontend/` → http://localhost:5173 (Vite redirige `/api` al backend).
4. Comprobación rápida: `GET http://localhost:5198/api/health` debe responder `{"status":"ok","database":"conectada"}`.

`.claude/launch.json` tiene las configuraciones `backend` y `frontend`; ambas funcionan en Windows.

## Hechos que importan

- **Conexión:** se usa el session pooler `aws-1-us-east-1.pooler.supabase.com:5432`, usuario `postgres.tlwxeoegldvwluwwqgmb`. La conexión directa (`db.<ref>.supabase.co`) es solo IPv6 y no funciona en esta red. El host `aws-0-…` no reconoce el proyecto.
- **La contraseña no está en el repositorio.** `appsettings.json` solo tiene host, puerto y usuario; la contraseña viene de user-secrets o de `Supabase__DbPassword`. Sin ella el backend no arranca y lo dice en el error.
- **Fechas y horas:** `fecha` y `fecha_nacimiento` son `date`, `hora` es `time`. Los modelos necesitan `TypeName = "date"` / `"time"`; sin eso Npgsql intenta escribir `timestamptz` y falla.
- **Esquema más estricto que en MySQL:** llaves foráneas `NOT NULL`, `consulta.id_cita` único (una consulta por cita), índices en las llaves foráneas.
- **RLS activado sin políticas** en las cinco tablas: la API REST automática de Supabase no puede leerlas. El backend entra como `postgres` (dueño de las tablas) y no se ve afectado. El aviso "RLS Enabled No Policy" del asesor de Supabase es intencional.
- **Supabase Auth ya firma con llaves asimétricas (ES256)**; el JWKS público está en `https://tlwxeoegldvwluwwqgmb.supabase.co/auth/v1/.well-known/jwks.json`. Sirve para validar tokens desde el backend sin compartir secretos.
- **El seed usa `current_date` del servidor (UTC)** y no es idempotente: correrlo dos veces duplica todo. El encabezado del archivo indica cómo vaciar las tablas.

## Verificado

- 34 de 34 pruebas en vivo contra Supabase: lectura de los cinco recursos, crear / editar / borrar en cada uno, fechas y horas exactas, acentos, 404 en ids inexistentes, rechazo de llaves foráneas inválidas y de consultas duplicadas. La prueba borró lo que creó.
- Frontend con datos reales: "Sistema en línea", sin errores de consola.
- Integridad de los datos sembrados: sin dobles reservas de doctor ni de paciente, sin consultas en citas futuras, niños solo en Pediatría.
- Paquetes NuGet sin vulnerabilidades conocidas. `npm audit --omit=dev`: 0.

El script de la prueba de endpoints no quedó en el repositorio; rehacerlo como prueba automatizada es parte de la fase 0 del plan.

## Problemas conocidos (entrada para el plan)

Comprobados en esta sesión:

- **Sin autenticación.** Cualquiera que alcance el API puede leer y modificar todo.
- **Errores de base de datos devuelven 500 con el stack trace** en desarrollo (borrar un paciente con citas, especialidad con doctores, segunda consulta para una cita, `PUT` a un id inexistente).
- **Sin validación de entrada:** `POST /api/Doctores` con nombre y apellido vacíos responde 201 y guarda la fila. Los controladores reciben las entidades de EF directamente.
- **Las dobles reservas solo las impide el frontend.** La base de datos no tiene restricción de unicidad por doctor/fecha/hora.
- **`GET` devuelve la tabla completa** en los cinco recursos, sin paginación ni filtros; el frontend carga todo y cruza en el navegador.
- **`/api/health` devuelve el mensaje de la excepción** cuando falla la conexión.
- **Sin cabeceras de seguridad** en las respuestas; `UseHttpsRedirection` no tiene puerto HTTPS configurado en el perfil `http`.
- **Pacientes no tiene `PUT`**: no se pueden editar.
- **Modo demostración:** si el backend no responde, el frontend muestra pacientes inventados con un aviso. Útil en desarrollo, riesgoso en una clínica real.
- **El usuario de la barra superior está fijo** ("Administración / Recepción").
- **Contraseña antigua de MySQL (`12345`) en el historial de git** (commits `61d41f5`, `f0fac04`). Era de una base local; no da acceso a Supabase.
- **13 vulnerabilidades en dependencias de desarrollo del frontend** (`npm audit`: vite, zod, otras). No llegan al build de producción.
- **Paquetes desactualizados:** Swashbuckle 6.4.0, Microsoft.AspNetCore.OpenApi 8.0.3.
- Carpetas `backend/Repositories` y `backend/Services` vacías; `docs/api-design.md` vacío; sin pruebas automatizadas ni CI.

## Lecciones

- Las herramientas de Supabase crean el proyecto y corren SQL, pero no dan ni fijan la contraseña de la base de datos: ese paso siempre es manual.
- Antes de escribir la cadena de conexión conviene comprobar qué host responde; se puede hacer sin contraseña mirando si el servidor pide autenticación o devuelve "tenant not found".
- `ToQueryString()` y `GenerateCreateScript()` de EF permiten comparar el modelo con el esquema real sin conectarse; así se detectó que el mapeo era correcto antes de tener la contraseña.
- Una prueba que "debería fallar por validación" puede terminar escribiendo en la base de datos: las pruebas de escritura deben limpiar siempre lo que crean.
