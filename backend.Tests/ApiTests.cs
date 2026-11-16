using System.Net;
using System.Net.Http.Json;
using HospitalAPI.Data;
using HospitalAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HospitalAPI.Tests;

public class AislamientoTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public void Todas_las_tablas_usan_el_esquema_de_pruebas()
    {
        using var scope = Fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        foreach (var tipo in new[] { typeof(Especialidad), typeof(Doctor), typeof(Paciente), typeof(Cita), typeof(Consulta) })
            Assert.Equal(ApiFixture.TestSchema, db.Model.FindEntityType(tipo)!.GetSchema());
    }

    [Fact]
    public async Task Health_confirma_la_conexion()
    {
        var respuesta = await Client.GetAsync("/api/health");

        await AssertEstado(HttpStatusCode.OK, respuesta);
        Assert.Contains("\"status\":\"ok\"", await respuesta.Content.ReadAsStringAsync());
    }
}

public class EspecialidadesTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task Crear_devuelve_201_con_id_y_se_puede_leer()
    {
        var creada = await CrearEspecialidad("Cardiología");

        Assert.True(creada.IdEspecialidad > 0);
        var leida = await Leer<EspecialidadJson>(await Client.GetAsync($"/api/Especialidades/{creada.IdEspecialidad}"));
        Assert.Equal("Cardiología", leida.Nombre);
    }

    [Fact]
    public async Task Listar_incluye_la_creada()
    {
        var creada = await CrearEspecialidad();

        var lista = await Leer<List<EspecialidadJson>>(await Client.GetAsync("/api/Especialidades"));

        Assert.Contains(lista, e => e.IdEspecialidad == creada.IdEspecialidad && e.Nombre == creada.Nombre);
    }

    [Fact]
    public async Task Editar_cambia_el_nombre()
    {
        var creada = await CrearEspecialidad();

        var respuesta = await Client.PutAsJsonAsync($"/api/Especialidades/{creada.IdEspecialidad}",
            new { idEspecialidad = creada.IdEspecialidad, nombre = "Neurología" });

        await AssertEstado(HttpStatusCode.NoContent, respuesta);
        var leida = await Leer<EspecialidadJson>(await Client.GetAsync($"/api/Especialidades/{creada.IdEspecialidad}"));
        Assert.Equal("Neurología", leida.Nombre);
    }

    [Fact]
    public async Task Editar_con_id_distinto_al_de_la_ruta_devuelve_400()
    {
        var creada = await CrearEspecialidad();

        var respuesta = await Client.PutAsJsonAsync($"/api/Especialidades/{creada.IdEspecialidad}",
            new { idEspecialidad = creada.IdEspecialidad + 1000, nombre = "Otra" });

        await AssertEstado(HttpStatusCode.BadRequest, respuesta);
    }

    [Fact]
    public async Task Borrar_la_elimina()
    {
        var creada = await CrearEspecialidad();

        await AssertEstado(HttpStatusCode.NoContent, await Client.DeleteAsync($"/api/Especialidades/{creada.IdEspecialidad}"));

        await AssertEstado(HttpStatusCode.NotFound, await Client.GetAsync($"/api/Especialidades/{creada.IdEspecialidad}"));
    }

    [Fact]
    public async Task Id_inexistente_devuelve_404()
    {
        await AssertEstado(HttpStatusCode.NotFound, await Client.GetAsync("/api/Especialidades/99999999"));
        await AssertEstado(HttpStatusCode.NotFound, await Client.DeleteAsync("/api/Especialidades/99999999"));
    }

    [Fact]
    public async Task Borrar_con_doctores_es_rechazado()
    {
        var especialidad = await CrearEspecialidad();
        await CrearDoctor(especialidad.IdEspecialidad);

        AssertRechazada(await Client.DeleteAsync($"/api/Especialidades/{especialidad.IdEspecialidad}"));

        await AssertEstado(HttpStatusCode.OK, await Client.GetAsync($"/api/Especialidades/{especialidad.IdEspecialidad}"));
    }
}

public class DoctoresTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task Crear_devuelve_la_especialidad_anidada()
    {
        var especialidad = await CrearEspecialidad("Pediatría");

        var doctor = await CrearDoctor(especialidad.IdEspecialidad);

        Assert.True(doctor.IdDoctor > 0);
        Assert.Equal(especialidad.IdEspecialidad, doctor.IdEspecialidad);
        Assert.Equal("Pediatría", doctor.Especialidad?.Nombre);
    }

    [Fact]
    public async Task Listar_incluye_la_especialidad_de_cada_doctor()
    {
        var doctor = await CrearDoctor();

        var lista = await Leer<List<DoctorJson>>(await Client.GetAsync("/api/Doctores"));

        var enLista = Assert.Single(lista, d => d.IdDoctor == doctor.IdDoctor);
        Assert.NotNull(enLista.Especialidad);
    }

    [Fact]
    public async Task Editar_cambia_apellido_y_especialidad()
    {
        var doctor = await CrearDoctor();
        var otra = await CrearEspecialidad();

        var respuesta = await Client.PutAsJsonAsync($"/api/Doctores/{doctor.IdDoctor}",
            new { idDoctor = doctor.IdDoctor, nombre = doctor.Nombre, apellido = "Editado", idEspecialidad = otra.IdEspecialidad });

        await AssertEstado(HttpStatusCode.NoContent, respuesta);
        var leido = await Leer<DoctorJson>(await Client.GetAsync($"/api/Doctores/{doctor.IdDoctor}"));
        Assert.Equal("Editado", leido.Apellido);
        Assert.Equal(otra.IdEspecialidad, leido.IdEspecialidad);
    }

    [Fact]
    public async Task Crear_con_especialidad_inexistente_es_rechazado()
    {
        var respuesta = await Client.PostAsJsonAsync("/api/Doctores",
            new { nombre = "Sin", apellido = "Especialidad", idEspecialidad = 99999999 });

        AssertRechazada(respuesta);
    }

    [Fact]
    public async Task Borrar_lo_elimina()
    {
        var doctor = await CrearDoctor();

        await AssertEstado(HttpStatusCode.NoContent, await Client.DeleteAsync($"/api/Doctores/{doctor.IdDoctor}"));

        await AssertEstado(HttpStatusCode.NotFound, await Client.GetAsync($"/api/Doctores/{doctor.IdDoctor}"));
    }

    [Fact]
    public async Task Borrar_con_citas_es_rechazado()
    {
        var doctor = await CrearDoctor();
        await CrearCita(idDoctor: doctor.IdDoctor);

        AssertRechazada(await Client.DeleteAsync($"/api/Doctores/{doctor.IdDoctor}"));
    }
}

public class PacientesTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task Crear_conserva_la_fecha_de_nacimiento()
    {
        var paciente = await CrearPaciente(fechaNacimiento: "1990-05-17");

        Assert.True(paciente.IdPaciente > 0);
        Assert.Equal("1990-05-17T00:00:00", paciente.FechaNacimiento);
    }

    [Fact]
    public async Task Crear_sin_fecha_de_nacimiento()
    {
        var paciente = await CrearPaciente(fechaNacimiento: null);

        Assert.Null(paciente.FechaNacimiento);
    }

    [Fact]
    public async Task Acentos_y_enie_se_guardan_intactos()
    {
        var creado = await CrearPaciente(apellido: "Quiñones Meléndez");

        var leido = await Leer<PacienteJson>(await Client.GetAsync($"/api/Pacientes/{creado.IdPaciente}"));

        Assert.Equal("Quiñones Meléndez", leido.Apellido);
    }

    [Fact]
    public async Task Listar_incluye_el_creado()
    {
        var creado = await CrearPaciente();

        var lista = await Leer<List<PacienteJson>>(await Client.GetAsync("/api/Pacientes"));

        Assert.Contains(lista, p => p.IdPaciente == creado.IdPaciente);
    }

    [Fact]
    public async Task Borrar_lo_elimina()
    {
        var paciente = await CrearPaciente();

        await AssertEstado(HttpStatusCode.NoContent, await Client.DeleteAsync($"/api/Pacientes/{paciente.IdPaciente}"));

        await AssertEstado(HttpStatusCode.NotFound, await Client.GetAsync($"/api/Pacientes/{paciente.IdPaciente}"));
    }

    [Fact]
    public async Task Borrar_con_citas_es_rechazado()
    {
        var paciente = await CrearPaciente();
        await CrearCita(idPaciente: paciente.IdPaciente);

        AssertRechazada(await Client.DeleteAsync($"/api/Pacientes/{paciente.IdPaciente}"));

        await AssertEstado(HttpStatusCode.OK, await Client.GetAsync($"/api/Pacientes/{paciente.IdPaciente}"));
    }
}

public class CitasTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task Crear_guarda_fecha_y_hora_exactas()
    {
        var cita = await CrearCita(fecha: "2026-12-20", hora: "09:15:00");

        Assert.True(cita.IdCita > 0);
        Assert.Equal("2026-12-20T00:00:00", cita.Fecha);
        Assert.Equal("09:15:00", cita.Hora);
    }

    [Fact]
    public async Task Leer_incluye_paciente_y_doctor()
    {
        var paciente = await CrearPaciente(apellido: "Anidado");
        var doctor = await CrearDoctor();
        var creada = await CrearCita(paciente.IdPaciente, doctor.IdDoctor);

        var leida = await Leer<CitaJson>(await Client.GetAsync($"/api/Citas/{creada.IdCita}"));

        Assert.Equal("Anidado", leida.Paciente?.Apellido);
        Assert.Equal(doctor.Apellido, leida.Doctor?.Apellido);
    }

    [Fact]
    public async Task Listar_incluye_la_creada_con_sus_relaciones()
    {
        var creada = await CrearCita();

        var lista = await Leer<List<CitaJson>>(await Client.GetAsync("/api/Citas"));

        var enLista = Assert.Single(lista, c => c.IdCita == creada.IdCita);
        Assert.NotNull(enLista.Paciente);
        Assert.NotNull(enLista.Doctor);
    }

    [Fact]
    public async Task Editar_cambia_fecha_hora_y_motivo()
    {
        var cita = await CrearCita();

        var respuesta = await Client.PutAsJsonAsync($"/api/Citas/{cita.IdCita}", new
        {
            idCita = cita.IdCita,
            idPaciente = cita.IdPaciente,
            idDoctor = cita.IdDoctor,
            fecha = "2026-12-21",
            hora = "14:45:00",
            motivo = "Cita editada",
        });

        await AssertEstado(HttpStatusCode.NoContent, respuesta);
        var leida = await Leer<CitaJson>(await Client.GetAsync($"/api/Citas/{cita.IdCita}"));
        Assert.Equal("2026-12-21T00:00:00", leida.Fecha);
        Assert.Equal("14:45:00", leida.Hora);
        Assert.Equal("Cita editada", leida.Motivo);
    }

    [Fact]
    public async Task Crear_con_paciente_inexistente_es_rechazado()
    {
        var doctor = await CrearDoctor();

        var respuesta = await Client.PostAsJsonAsync("/api/Citas",
            new { idPaciente = 99999999, idDoctor = doctor.IdDoctor, fecha = "2026-12-20", hora = "10:00:00", motivo = "x" });

        AssertRechazada(respuesta);
    }

    [Fact]
    public async Task Borrar_la_elimina()
    {
        var cita = await CrearCita();

        await AssertEstado(HttpStatusCode.NoContent, await Client.DeleteAsync($"/api/Citas/{cita.IdCita}"));

        await AssertEstado(HttpStatusCode.NotFound, await Client.GetAsync($"/api/Citas/{cita.IdCita}"));
    }

    [Fact]
    public async Task Borrar_con_consulta_es_rechazado()
    {
        var cita = await CrearCita();
        await CrearConsulta(cita.IdCita);

        AssertRechazada(await Client.DeleteAsync($"/api/Citas/{cita.IdCita}"));
    }
}

public class ConsultasTests(ApiFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task Crear_devuelve_201_y_se_puede_leer()
    {
        var cita = await CrearCita();

        var creada = await CrearConsulta(cita.IdCita);

        var leida = await Leer<ConsultaJson>(await Client.GetAsync($"/api/Consultas/{creada.IdConsulta}"));
        Assert.Equal(cita.IdCita, leida.IdCita);
        Assert.Equal("Diagnóstico de prueba", leida.Diagnostico);
    }

    [Fact]
    public async Task Listar_incluye_la_creada()
    {
        var creada = await CrearConsulta();

        var lista = await Leer<List<ConsultaJson>>(await Client.GetAsync("/api/Consultas"));

        Assert.Contains(lista, c => c.IdConsulta == creada.IdConsulta);
    }

    [Fact]
    public async Task Editar_cambia_diagnostico_y_observaciones()
    {
        var consulta = await CrearConsulta();

        var respuesta = await Client.PutAsJsonAsync($"/api/Consultas/{consulta.IdConsulta}",
            new { idConsulta = consulta.IdConsulta, idCita = consulta.IdCita, diagnostico = "Editado", observaciones = "Observación editada" });

        await AssertEstado(HttpStatusCode.NoContent, respuesta);
        var leida = await Leer<ConsultaJson>(await Client.GetAsync($"/api/Consultas/{consulta.IdConsulta}"));
        Assert.Equal("Editado", leida.Diagnostico);
        Assert.Equal("Observación editada", leida.Observaciones);
    }

    [Fact]
    public async Task Segunda_consulta_para_la_misma_cita_es_rechazada()
    {
        var primera = await CrearConsulta();

        var respuesta = await Client.PostAsJsonAsync("/api/Consultas",
            new { idCita = primera.IdCita, diagnostico = "Duplicada", observaciones = "x" });

        AssertRechazada(respuesta);
    }

    [Fact]
    public async Task Borrar_la_elimina_y_libera_la_cita()
    {
        var consulta = await CrearConsulta();

        await AssertEstado(HttpStatusCode.NoContent, await Client.DeleteAsync($"/api/Consultas/{consulta.IdConsulta}"));

        await AssertEstado(HttpStatusCode.NotFound, await Client.GetAsync($"/api/Consultas/{consulta.IdConsulta}"));
        await CrearConsulta(consulta.IdCita);
    }
}

/// <summary>
/// Comportamiento que la fase 1 del plan (docs/HARDENING_PLAN.md) debe lograr.
/// Hoy fallan; se activan quitando el Skip a medida que se implementa.
/// </summary>
public class PendientesFase1Tests(ApiFixture fixture) : ApiTestBase(fixture)
{
    private const string Fase1 = "Pendiente: fase 1 del plan de hardening";

    [Fact(Skip = Fase1)]
    public async Task Crear_doctor_con_nombre_vacio_devuelve_400()
    {
        var especialidad = await CrearEspecialidad();

        var respuesta = await Client.PostAsJsonAsync("/api/Doctores",
            new { nombre = "", apellido = "", idEspecialidad = especialidad.IdEspecialidad });

        await AssertEstado(HttpStatusCode.BadRequest, respuesta);
    }

    [Fact(Skip = Fase1)]
    public async Task Editar_un_id_inexistente_devuelve_404()
    {
        var respuesta = await Client.PutAsJsonAsync("/api/Especialidades/99999999",
            new { idEspecialidad = 99999999, nombre = "No existe" });

        await AssertEstado(HttpStatusCode.NotFound, respuesta);
    }

    [Fact(Skip = Fase1)]
    public async Task Borrar_con_dependientes_devuelve_409()
    {
        var especialidad = await CrearEspecialidad();
        await CrearDoctor(especialidad.IdEspecialidad);

        await AssertEstado(HttpStatusCode.Conflict, await Client.DeleteAsync($"/api/Especialidades/{especialidad.IdEspecialidad}"));
    }

    [Fact(Skip = Fase1)]
    public async Task Doble_reserva_del_mismo_doctor_devuelve_409()
    {
        var doctor = await CrearDoctor();
        await CrearCita(idDoctor: doctor.IdDoctor, fecha: "2026-12-22", hora: "10:00:00");
        var otroPaciente = await CrearPaciente();

        var respuesta = await Client.PostAsJsonAsync("/api/Citas",
            new { idPaciente = otroPaciente.IdPaciente, idDoctor = doctor.IdDoctor, fecha = "2026-12-22", hora = "10:00:00", motivo = "Choque" });

        await AssertEstado(HttpStatusCode.Conflict, respuesta);
    }
}
