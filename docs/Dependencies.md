# Dependencies

## Backend (.NET C#)

To run the backend, ensure you have the following installed:

- [.NET SDK](https://dotnet.microsoft.com/download) 8.0 (see `Hospital_Database.csproj`)
- Restore NuGet packages by running `dotnet restore` in the `backend/` directory.

Key NuGet dependencies:
- `Npgsql.EntityFrameworkCore.PostgreSQL` (Entity Framework Core provider for PostgreSQL / Supabase)
- `Swashbuckle.AspNetCore` (Swagger API documentation)
- `Microsoft.AspNetCore.OpenApi`

Run the backend with `dotnet run` in `backend/`.

## Frontend (React/Vite)

To run the frontend, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16 or later)
- Run `npm install` in the `frontend/` directory to install dependencies from `package.json`.

Key npm dependencies (inferred from Vite and React setup):
- `react`
- `react-dom`
- `@vitejs/plugin-react`
- `vite`
- `eslint` (for linting, based on `eslint.config.js`)

Run the frontend with `npm run dev` in `frontend/`.

## Database

The database is PostgreSQL hosted on Supabase (project `Hospital_Database`); nothing needs to be installed locally.

- Schema: `database/schema/init.sql` (already applied to the Supabase project).
- Test data: `database/seeds/seed.sql` (already loaded; run it only on empty tables).
- Both can be re-run from the Supabase SQL Editor on a fresh project.

The database password is never stored in the repository. Set it once per machine from `backend/`:

```bash
dotnet user-secrets set "Supabase:DbPassword" "<password>"
```

(or the environment variable `Supabase__DbPassword`). Get or reset the password in the Supabase Dashboard under Database → Settings. The non-secret part of the connection string (host, port, user) lives in `backend/appsettings.json`.

## Additional Setup

- Backend runs on http://localhost:5198, frontend on http://localhost:5173 (Vite proxies `/api` to the backend).
- `GET http://localhost:5198/api/health` confirms the API can reach the database.
- Refer to `README.md` and `README(React).md` for detailed setup instructions.