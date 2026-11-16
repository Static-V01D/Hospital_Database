# Plan de reestructuración, hardening y autenticación — NOVAMED

Estado: fase 0 terminada (2026-11-15); fases 1 a 4 pendientes. Punto de partida: [SUPABASE_AAR.md](SUPABASE_AAR.md).

## Objetivo

Que NOVAMED sea más eficaz (respuestas rápidas, errores claros, código mantenible) y más segura (entrada validada, mínimo privilegio, sin fugas de información), y cerrar con un sistema de inicio de sesión y permisos por rol.

**Advertencia de orden:** el inicio de sesión va al final, como se pidió. Hasta que la fase 4 esté terminada, el API no debe publicarse en internet ni recibir datos reales de pacientes: hoy cualquiera que lo alcance puede leer y modificar todo.

## Resumen de fases

| Fase | Qué resuelve | Tamaño | Depende de | Estado |
|---|---|---|---|---|
| 0. Red de seguridad | Pruebas automatizadas y CI para poder cambiar sin romper | Pequeño | — | Hecha |
| 1. Reestructuración del backend | Validación, errores claros, capas, paginación | Grande | 0 | Pendiente |
| 2. Hardening del API y del frontend | Cabeceras, HTTPS, límites, sin fugas, sin modo demo en producción | Mediano | 1 | Pendiente |
| 3. Hardening de la base de datos | Mínimo privilegio, restricciones, auditoría, migraciones | Mediano | 1 | Pendiente |
| 4. Inicio de sesión y permisos | Autenticación, roles, sesión en el frontend | Grande | 1, 2, 3 | Pendiente |

Cada fase termina con las pruebas en verde y un commit propio. Las fases 2 y 3 son independientes entre sí y pueden hacerse en cualquier orden.

---

## Fase 0 — Red de seguridad (hecha)

1. **Proyecto de pruebas** `backend.Tests` (xUnit + `WebApplicationFactory`): 33 pruebas que arrancan la API en memoria y cubren lectura, crear / editar / borrar por recurso, formatos de fecha y hora y rechazos esperados. Otras 4 están escritas y marcadas `Skip`: describen lo que la fase 1 debe lograr (400 con nombre vacío, 404 al editar un id inexistente, 409 en conflictos y en doble reserva).
2. **Esquema de pruebas separado.** Las pruebas usan el esquema `test`, que se borra y se recrea desde `database/schema/init.sql` en cada ejecución; los datos de `public` no se tocan. Para eso el backend acepta la configuración `Database:Schema` e `init.sql` ya no lleva el prefijo `public.`. Si la API no queda apuntando a `test`, las pruebas se cancelan antes de ejecutar nada.
3. **CI con GitHub Actions** (`.github/workflows/ci.yml`): backend (compilar, pruebas, paquetes vulnerables) y frontend (lint, build, auditoría). En CI las pruebas corren contra un Postgres desechable del propio workflow, así que no hace falta guardar ninguna contraseña en GitHub. La auditoría de dependencias de producción bloquea; la de desarrollo solo informa.
4. **Dependencias:** `npm audit fix` dejó el frontend en 0 avisos; Swashbuckle pasó a 6.9.0; `Microsoft.AspNetCore.OpenApi` se eliminó porque no se usaba.
5. **Lint:** `npm run lint` fallaba en `vite.config.js` (`process` no definido); corregido en `eslint.config.js`.

Cómo correr las pruebas en local: `dotnet test backend.Tests` (usa la contraseña de user-secrets y tarda unos 20 segundos). El backend no puede estar corriendo a la vez, porque bloquea los archivos compilados.

Pendiente de comprobar: el workflow no se ha ejecutado todavía en GitHub; corre por primera vez al subir estos cambios.

## Fase 1 — Reestructuración del backend

El problema de fondo: los controladores reciben y devuelven las entidades de EF, hablan directo con el `DbContext` y no validan nada.

1. **DTOs de entrada por operación** (`CrearCitaRequest`, `ActualizarCitaRequest`, …) con validación: campos obligatorios no vacíos, longitudes según el esquema, teléfono y email con formato, hora en intervalos válidos. Elimina el over-posting (hoy un `POST` puede mandar `idCita` u objetos anidados) y el caso comprobado de doctores con nombre vacío.
2. **Capa de servicios** en `backend/Services` (la carpeta ya existe vacía): un servicio por recurso con las reglas de negocio. Los controladores quedan delgados. `backend/Repositories` se elimina; EF ya cumple ese papel y otra capa solo añade código.
3. **Reglas de negocio en el servidor**, hoy solo en el frontend:
   - sin doble reserva de doctor ni de paciente en la misma fecha y hora;
   - una consulta por cita, y solo para citas de hoy o anteriores;
   - no borrar pacientes, doctores o especialidades con registros dependientes.
4. **Errores uniformes con ProblemDetails:** 400 validación, 404 no existe, 409 conflicto (llave foránea, duplicado, doble reserva), con mensaje en español. Un manejador global traduce las excepciones de Postgres (`23503`, `23505`) y nunca devuelve el stack trace. El frontend ya lee `title` / `detail`, así que mostrará el mensaje sin cambios.
5. **`PUT` correcto:** comprobar que el registro existe (hoy un id inexistente da 500) y añadir `PUT /api/Pacientes/{id}`, que falta. En el frontend, habilitar la edición de pacientes.
6. **Lecturas eficientes:** `AsNoTracking` y proyección directa a DTO; paginación (`?pagina=&tamano=`) y filtros (`/api/Citas?desde=&hasta=&idDoctor=&idPaciente=`); un endpoint `/api/Panel/resumen` que calcule los totales del panel en la base de datos en vez de descargar las cinco tablas.
7. **Frontend:** adaptar `api.js` y `useData` a las respuestas paginadas y a los filtros. Es el único cambio de contrato del plan; se hace recurso por recurso para no romper las páginas.
8. **Limpieza:** DTOs sin uso (`*WithCitas`, `*Simple` duplicados), advertencias de nulabilidad, `docs/api-design.md` con el contrato real.

Hecho cuando: ninguna operación inválida devuelve 500, el panel carga con una sola petición de resumen y las pruebas cubren cada regla.

## Fase 2 — Hardening del API y del frontend

1. **Transporte:** HTTPS obligatorio y HSTS fuera de desarrollo; quitar el aviso actual de `UseHttpsRedirection` definiendo el puerto.
2. **Cabeceras de seguridad** (hoy no hay ninguna): `X-Content-Type-Options`, `X-Frame-Options` / `frame-ancestors`, `Referrer-Policy`, y una Content-Security-Policy para el frontend. La fuente de Google Fonts se sirve localmente para que la CSP no dependa de terceros.
3. **CORS por configuración**, no fijo en el código: orígenes permitidos por entorno, solo los métodos y cabeceras que se usan.
4. **Límite de peticiones** con el `RateLimiter` integrado de .NET 8: general por IP y más estricto en escrituras.
5. **Límites de tamaño** de cuerpo y de página (tope al `tamano` de la paginación).
6. **Sin fugas de información:** `/api/health` deja de devolver el mensaje de la excepción; Swagger y la página de excepciones solo en desarrollo (ya es así, se añade una prueba que lo garantice); cabecera `Server` oculta.
7. **Registros sin datos de pacientes:** el SQL de EF pasa a nivel `Warning` fuera de desarrollo y `EnableSensitiveDataLogging` queda prohibido; registro estructurado de cada escritura con quién, qué recurso y qué id, sin el contenido clínico.
8. **Modo demostración solo en desarrollo:** en el build de producción, si el backend no responde se muestra un error, nunca pacientes inventados. Se controla con una variable `VITE_DEMO`.
9. **`AllowedHosts`** con los dominios reales en vez de `*`.

Hecho cuando: un escaneo de cabeceras (por ejemplo securityheaders.com sobre el entorno desplegado) no marca faltantes y las pruebas cubren el límite de peticiones y la ausencia de trazas.

## Fase 3 — Hardening de la base de datos

1. **Rol de mínimo privilegio.** El backend entra hoy como `postgres`, que puede hacer cualquier cosa. Crear un rol `hospital_api` con permisos solo de lectura y escritura sobre las cinco tablas, sin poder alterar el esquema, y políticas RLS que le den acceso solo a él. La contraseña del rol la define el dueño del proyecto, no queda en el repositorio.
2. **Quitar permisos a `anon` y `authenticated`** sobre las tablas, además del RLS: dos barreras en vez de una.
3. **Restricciones que hoy solo viven en el frontend:**
   - `unique (id_doctor, fecha, hora)` y `unique (id_paciente, fecha, hora)` en `cita`;
   - `check` de nombres no vacíos y de hora dentro del horario de la clínica.
4. **Columnas de auditoría** (`creado_en`, `actualizado_en`, y `creado_por` / `actualizado_por` cuando exista la fase 4) y una tabla `auditoria` llenada por triggers con cada cambio en pacientes, citas y consultas.
5. **Migraciones versionadas** en `database/migrations/` (numeradas, una por cambio). `init.sql` queda como la migración 001. Así el esquema de Supabase y el del repositorio no se separan.
6. **Conexión verificada:** `SSL Mode=VerifyFull` con el certificado raíz de Supabase en vez de `Require`, que cifra pero no comprueba la identidad del servidor.
7. **Respaldos:** el plan gratuito no los incluye de forma automática (confirmar en el panel de Supabase). Programar un `pg_dump` periódico o subir de plan antes de guardar datos reales.
8. **Rotación de la contraseña** de `postgres` al terminar la fase, ya que deja de usarse desde la app.

Hecho cuando: el backend funciona con `hospital_api`, un intento de `DROP TABLE` desde ese rol falla, y la doble reserva se rechaza aunque se llame al API sin pasar por el frontend.

## Fase 4 — Inicio de sesión y permisos

### Enfoque recomendado: Supabase Auth + validación del token en el API

El proyecto ya está en Supabase y su servicio de autenticación ya firma tokens con llaves asimétricas (ES256, comprobado). El flujo sería:

1. El frontend muestra una pantalla de inicio de sesión (correo y contraseña) y usa `@supabase/supabase-js` para autenticarse.
2. Supabase devuelve un token de acceso de corta duración y uno de renovación.
3. `api.js` envía el token en `Authorization: Bearer …` en cada petición.
4. El backend valida la firma contra el JWKS público de Supabase con `JwtBearer`, comprueba emisor, audiencia y expiración, y lee el rol.
5. Todos los endpoints exigen sesión por defecto; cada uno declara qué roles pueden usarlo.

El API sigue siendo la única puerta a los datos; la API REST automática de Supabase permanece bloqueada.

**Por qué este enfoque:** el almacenamiento de contraseñas, la recuperación por correo, el bloqueo por intentos fallidos y el segundo factor ya existen en Supabase y no hay que programarlos ni mantenerlos. El backend no guarda ningún secreto de autenticación.

**Alternativa:** ASP.NET Core Identity con tablas propias y cookie de sesión `HttpOnly`. La cookie no es accesible desde JavaScript, lo que la protege mejor ante un XSS, y no añade dependencias al frontend. A cambio hay que programar y mantener registro, recuperación de contraseña, envío de correos y bloqueo de cuentas. Conviene si se quiere salir de Supabase más adelante.

### Roles propuestos

| Rol | Puede |
|---|---|
| `admin` | Todo, incluidos médicos, especialidades y usuarios |
| `recepcion` | Pacientes y citas (crear, editar, cancelar); leer médicos y especialidades |
| `medico` | Leer sus citas y pacientes; registrar y editar consultas de sus propias citas |

El rol se guarda en `app_metadata` del usuario en Supabase (solo modificable desde el servidor) y viaja dentro del token. Un médico se enlaza a su fila con una columna `doctor.id_usuario`.

### Pasos

1. **Supabase:** desactivar el registro público (las cuentas las crea un administrador por invitación), política de contraseñas, duración de sesión, plantillas de correo en español. Segundo factor obligatorio para `admin`.
2. **Backend:** `AddAuthentication().AddJwtBearer(...)` con el JWKS; política por defecto que exige sesión; políticas por rol; `/api/health` queda público. `GET /api/Yo` devuelve el usuario y su rol.
3. **Filtro por pertenencia:** un `medico` solo ve y modifica lo suyo; se aplica en los servicios de la fase 1, no en el frontend.
4. **Frontend:** pantalla de inicio de sesión, cierre de sesión, renovación automática del token, redirección al inicio de sesión ante un 401, menú y botones según el rol, y el usuario real en la barra superior (hoy fijo en "Administración / Recepción").
5. **Sesión en computadoras compartidas:** cierre automático por inactividad (propuesta: 15 minutos) y cierre al cerrar el navegador.
6. **Gestión de usuarios:** página de administración para invitar, cambiar rol y desactivar cuentas. Usa una llave de servicio de Supabase que vive solo en el backend.
7. **Auditoría:** la tabla de la fase 3 empieza a registrar quién hizo cada cambio.
8. **Pruebas:** sin token → 401; rol insuficiente → 403; token vencido o con firma inválida → 401; un médico no puede leer citas ajenas.

Hecho cuando: ningún endpoint de datos responde sin sesión, cada rol solo puede hacer lo de su tabla y las pruebas lo demuestran.

### Riesgo conocido del enfoque

`supabase-js` guarda la sesión en el almacenamiento del navegador, legible por JavaScript. Un XSS podría robarla. Se mitiga con la CSP de la fase 2, tokens de acceso cortos y el hecho de que el frontend no inserta HTML sin escapar (revisado: no usa `dangerouslySetInnerHTML`). Si ese riesgo no es aceptable, la alternativa con cookie lo elimina.

---

## Decisiones que necesito de ti

1. **Enfoque de autenticación:** Supabase Auth (recomendado) o ASP.NET Core Identity.
2. **Roles:** si los tres propuestos y sus permisos reflejan cómo trabaja la clínica.
3. **Datos reales:** si NOVAMED va a guardar datos de pacientes reales. En Puerto Rico eso implica cumplir con HIPAA, y Supabase solo firma el acuerdo necesario (BAA) en planes de pago; habría que confirmarlo con ellos antes de cargar datos reales. Si es un proyecto académico o de demostración, no aplica.
4. **Dónde se va a publicar** el backend y el frontend. Varias tareas de la fase 2 (HTTPS, dominios permitidos, CSP) dependen de eso.

## Fuera de este plan

- Reescribir el historial de git para borrar la contraseña antigua de MySQL (`12345`). Era de una base local que ya no se usa; reescribir el historial ya publicado causa más problemas de los que resuelve.
- Facturación, tratamientos y otros módulos listados en `docs/database-design.md`.
- Migrar el frontend a TypeScript.
