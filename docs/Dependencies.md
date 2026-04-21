# Dependencies

## Backend (.NET C#)

To run the backend, ensure you have the following installed:

- [.NET SDK](https://dotnet.microsoft.com/download) (version 6.0 or later, based on `Hospital_Database.csproj`)
- Restore NuGet packages by running `dotnet restore` in the `backend/` directory.

Key NuGet dependencies (inferred from typical ASP.NET Core project structure with Controllers and Models):
- `Microsoft.AspNetCore` (for web API)
- `Microsoft.EntityFrameworkCore` (for database ORM, assuming Entity Framework usage in `Data/Models/`)
- `Microsoft.EntityFrameworkCore.SqlServer` or `Npgsql` (for database provider, check `appsettings.json` for connection string)
- `Swashbuckle.AspNetCore` (for Swagger API documentation, if used)

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

- Install a database server (e.g., SQL Server, PostgreSQL, or SQLite, based on schema in `database/schema/`)
- Run seed scripts from `database/seeds/` to populate data.

## Additional Setup

- Ensure ports are configured correctly (backend typically on 5000-5001, frontend on 3000 or Vite default).
- For full integration, update `appsettings.json` with correct database connection strings.
- Refer to `README.md` and `README(React).md` for detailed setup instructions.