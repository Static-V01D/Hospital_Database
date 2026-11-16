using HospitalAPI.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace HospitalAPI.Tests;

/// <summary>
/// Arranca la API en memoria apuntando al esquema "test" de la base de datos y
/// lo recrea desde database/schema/init.sql antes de correr las pruebas.
/// Los datos reales (esquema "public") nunca se tocan.
///
/// Conexión: la misma configuración que la app (user-secrets en local, o la
/// variable ConnectionStrings__DefaultConnection en CI).
/// </summary>
public class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Fijo a propósito: este nombre se usa en un DROP SCHEMA y no debe poder
    // venir de configuración.
    public const string TestSchema = "test";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Schema", TestSchema);

        // Varias pruebas provocan errores a propósito; sin esto la salida se
        // llena de trazas esperadas. Cada fallo de prueba ya muestra el cuerpo
        // de la respuesta.
        builder.ConfigureLogging(logging => logging.ClearProviders());
    }

    public async Task InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Seguro: si la API no quedó apuntando al esquema de pruebas, no se ejecuta nada.
        if (db.Model.GetDefaultSchema() != TestSchema)
            throw new InvalidOperationException(
                $"La API no está usando el esquema '{TestSchema}'. Se cancelan las pruebas para no tocar datos reales.");

        var script = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "init.sql"));

        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await connection.OpenAsync();
        await using var tx = await connection.BeginTransactionAsync();

        await using (var reset = new NpgsqlCommand(
            $"drop schema if exists {TestSchema} cascade; create schema {TestSchema}; set local search_path to {TestSchema};",
            connection, tx))
        {
            await reset.ExecuteNonQueryAsync();
        }

        await using (var create = new NpgsqlCommand(script, connection, tx))
        {
            await create.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
        await connection.CloseAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;
}

// Todas las clases de prueba comparten una sola API y un solo esquema, y
// corren una tras otra.
[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "api";
}
