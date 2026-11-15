// ============================================
// IMPORTS
// ============================================

using HospitalAPI.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

// ============================================
// CREACIÓN DEL BUILDER
// ============================================

var builder = WebApplication.CreateBuilder(args);

// ============================================
// CONFIGURACIÓN DE SERVICIOS (DEPENDENCY INJECTION)
// ============================================

// 🔹 Agregar soporte para Controllers (API REST)
builder.Services.AddControllers();

// 🔹 Configurar Swagger (documentación automática de la API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 🔹 Configurar conexión a PostgreSQL (Supabase) usando Entity Framework
//
// appsettings.json contiene solo los datos NO secretos (host, puerto, usuario).
// La contraseña de la base de datos nunca se guarda en el repositorio; se lee de:
//   - user-secrets (desarrollo):  dotnet user-secrets set "Supabase:DbPassword" "<contraseña>"
//   - variable de entorno:        Supabase__DbPassword=<contraseña>
// También se puede sobrescribir toda la cadena con ConnectionStrings__DefaultConnection.
var connectionString = BuildConnectionString(builder.Configuration);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString)
);

// 🔹 Configurar CORS (permite que React se conecte al backend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173") // URL de React (Vite)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

// ============================================
// CREAR LA APP
// ============================================

var app = builder.Build();

// ============================================
// CONFIGURACIÓN DEL PIPELINE HTTP
// ============================================

// 🔹 Swagger solo en desarrollo (recomendado)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 🔹 Redirección HTTPS
app.UseHttpsRedirection();

// 🔹 Habilitar CORS
app.UseCors("AllowReactApp");

// 🔹 Habilitar autorización (aunque aún no implementamos auth)
app.UseAuthorization();

// 🔹 Mapear controllers (activar endpoints)
app.MapControllers();

// 🔹 Health check: confirma que la API llega a la base de datos
app.MapGet("/api/health", async (ApplicationDbContext db) =>
{
    try
    {
        await db.Database.OpenConnectionAsync();
        await db.Database.CloseConnectionAsync();
        return Results.Ok(new { status = "ok", database = "conectada" });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "No se pudo conectar con la base de datos",
            detail: ex.Message,
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

// ============================================
// EJECUTAR LA APP
// ============================================

app.Run();

// ============================================
// HELPERS
// ============================================

static string BuildConnectionString(IConfiguration config)
{
    var baseConnection = config.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(baseConnection))
        throw new InvalidOperationException(
            "Falta ConnectionStrings:DefaultConnection en la configuración.");

    var csb = new NpgsqlConnectionStringBuilder(baseConnection);

    var password = config["Supabase:DbPassword"];
    if (!string.IsNullOrWhiteSpace(password))
        csb.Password = password;

    if (string.IsNullOrEmpty(csb.Password))
        throw new InvalidOperationException(
            "Falta la contraseña de la base de datos de Supabase. Configúrela con:\n" +
            "  dotnet user-secrets set \"Supabase:DbPassword\" \"<contraseña>\"\n" +
            "o con la variable de entorno Supabase__DbPassword.");

    return csb.ConnectionString;
}
