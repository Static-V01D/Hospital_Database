using System.Net;
using System.Net.Http.Json;

namespace HospitalAPI.Tests;

// Forma del JSON que devuelve la API. Fecha y hora se leen como texto para
// comprobar el formato exacto del que depende el frontend.
public record EspecialidadJson(int IdEspecialidad, string Nombre);
public record DoctorJson(int IdDoctor, string Nombre, string Apellido, int IdEspecialidad, EspecialidadJson? Especialidad);
public record PacienteJson(int IdPaciente, string Nombre, string Apellido, string? FechaNacimiento, string Telefono, string Email);
public record CitaJson(int IdCita, int IdPaciente, int IdDoctor, string Fecha, string Hora, string Motivo, PacienteJson? Paciente, DoctorJson? Doctor);
public record ConsultaJson(int IdConsulta, int IdCita, string Diagnostico, string Observaciones);

[Collection(ApiCollection.Name)]
public abstract class ApiTestBase
{
    protected readonly ApiFixture Fixture;
    protected readonly HttpClient Client;

    protected ApiTestBase(ApiFixture fixture)
    {
        Fixture = fixture;
        Client = fixture.CreateClient();
    }

    protected static string Unico(string prefijo) => $"{prefijo} {Guid.NewGuid().ToString("N")[..8]}";

    protected static async Task<T> Leer<T>(HttpResponseMessage respuesta, HttpStatusCode esperado = HttpStatusCode.OK)
    {
        await AssertEstado(esperado, respuesta);
        return (await respuesta.Content.ReadFromJsonAsync<T>())!;
    }

    protected static async Task AssertEstado(HttpStatusCode esperado, HttpResponseMessage respuesta)
    {
        if (respuesta.StatusCode == esperado) return;
        var cuerpo = await respuesta.Content.ReadAsStringAsync();
        Assert.Fail($"Se esperaba {(int)esperado} y llegó {(int)respuesta.StatusCode}: {(cuerpo.Length > 300 ? cuerpo[..300] : cuerpo)}");
    }

    /// <summary>
    /// La operación no debe haberse aplicado. Hoy la API responde 500 en estos
    /// casos; la fase 1 del plan los convierte en 400/404/409 y estas
    /// comprobaciones se vuelven exactas.
    /// </summary>
    protected static void AssertRechazada(HttpResponseMessage respuesta) =>
        Assert.False(respuesta.IsSuccessStatusCode, $"La operación debió rechazarse y respondió {(int)respuesta.StatusCode}.");

    // ---------- constructores de datos ----------

    protected async Task<EspecialidadJson> CrearEspecialidad(string? nombre = null) =>
        await Leer<EspecialidadJson>(
            await Client.PostAsJsonAsync("/api/Especialidades", new { nombre = nombre ?? Unico("Especialidad") }),
            HttpStatusCode.Created);

    protected async Task<DoctorJson> CrearDoctor(int? idEspecialidad = null)
    {
        var especialidad = idEspecialidad ?? (await CrearEspecialidad()).IdEspecialidad;
        return await Leer<DoctorJson>(
            await Client.PostAsJsonAsync("/api/Doctores", new { nombre = "Doctora", apellido = Unico("Prueba"), idEspecialidad = especialidad }),
            HttpStatusCode.Created);
    }

    protected async Task<PacienteJson> CrearPaciente(string apellido = "Prueba", string? fechaNacimiento = "1990-05-17") =>
        await Leer<PacienteJson>(
            await Client.PostAsJsonAsync("/api/Pacientes", new
            {
                nombre = "Paciente",
                apellido,
                fechaNacimiento,
                telefono = "7875550000",
                email = "paciente.prueba@example.com",
            }),
            HttpStatusCode.Created);

    protected async Task<CitaJson> CrearCita(int? idPaciente = null, int? idDoctor = null, string fecha = "2026-12-20", string hora = "09:15:00")
    {
        var paciente = idPaciente ?? (await CrearPaciente()).IdPaciente;
        var doctor = idDoctor ?? (await CrearDoctor()).IdDoctor;
        return await Leer<CitaJson>(
            await Client.PostAsJsonAsync("/api/Citas", new { idPaciente = paciente, idDoctor = doctor, fecha, hora, motivo = "Cita de prueba" }),
            HttpStatusCode.Created);
    }

    protected async Task<ConsultaJson> CrearConsulta(int? idCita = null)
    {
        var cita = idCita ?? (await CrearCita()).IdCita;
        return await Leer<ConsultaJson>(
            await Client.PostAsJsonAsync("/api/Consultas", new { idCita = cita, diagnostico = "Diagnóstico de prueba", observaciones = "Sin observaciones" }),
            HttpStatusCode.Created);
    }
}
