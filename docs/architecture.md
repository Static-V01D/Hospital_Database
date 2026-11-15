System Architecture

Frontend:
React dashboard

Backend:
ASP.NET Core REST API (Entity Framework Core + Npgsql)

Database:
PostgreSQL relational database hosted on Supabase


React
  ↓
ASP.NET API
  ↓
Supabase (PostgreSQL)

The API connects straight to Postgres through Supabase's session pooler
(IPv4). Supabase's auto-generated REST API is not used: row level security
is enabled on every table with no policies, so only the backend can read
or write the data.
