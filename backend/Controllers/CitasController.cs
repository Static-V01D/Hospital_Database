using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalAPI.Data;
using HospitalAPI.Models;
using HospitalAPI.DTOs;

namespace HospitalAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CitasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CitasController(ApplicationDbContext context)
        {
            _context = context;
        }

        private CitaDTO MapToCitaDTO(Cita cita)
        {
            if (cita == null) return null;

            return new CitaDTO
            {
                IdCita = cita.IdCita,
                IdPaciente = cita.IdPaciente,
                IdDoctor = cita.IdDoctor,
                Fecha = cita.Fecha,
                Hora = cita.Hora,
                Motivo = cita.Motivo,
                Paciente = cita.Paciente != null ? new PacienteDTO
                {
                    IdPaciente = cita.Paciente.IdPaciente,
                    Nombre = cita.Paciente.Nombre,
                    Apellido = cita.Paciente.Apellido,
                    FechaNacimiento = cita.Paciente.FechaNacimiento,
                    Telefono = cita.Paciente.Telefono,
                    Email = cita.Paciente.Email
                } : null,
                Doctor = cita.Doctor != null ? new DoctorSimpleDTO
                {
                    IdDoctor = cita.Doctor.IdDoctor,
                    Nombre = cita.Doctor.Nombre,
                    Apellido = cita.Doctor.Apellido,
                    IdEspecialidad = cita.Doctor.IdEspecialidad
                } : null
            };
        }

        // GET: api/citas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CitaDTO>>> GetCitas()
        {
            var citas = await _context.Citas
                                 .Include(c => c.Paciente)
                                 .Include(c => c.Doctor)
                                 .ToListAsync();

            return citas.Select(MapToCitaDTO).ToList();
        }

        // GET: api/citas/1
        [HttpGet("{id}")]
        public async Task<ActionResult<CitaDTO>> GetCita(int id)
        {
            var cita = await _context.Citas
                                     .Include(c => c.Paciente)
                                     .Include(c => c.Doctor)
                                     .FirstOrDefaultAsync(c => c.IdCita == id);

            if (cita == null)
                return NotFound();

            return MapToCitaDTO(cita);
        }

        // POST: api/citas
        [HttpPost]
        public async Task<ActionResult<CitaDTO>> PostCita(Cita cita)
        {
            _context.Citas.Add(cita);
            await _context.SaveChangesAsync();
            
            var createdCita = await _context.Citas
                                            .Include(c => c.Paciente)
                                            .Include(c => c.Doctor)
                                            .FirstOrDefaultAsync(c => c.IdCita == cita.IdCita);

            return CreatedAtAction(nameof(GetCita), new { id = cita.IdCita }, MapToCitaDTO(createdCita));
        }

        // PUT: api/citas/1
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCita(int id, Cita cita)
        {
            if (id != cita.IdCita)
                return BadRequest();

            _context.Entry(cita).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/citas/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCita(int id)
        {
            var cita = await _context.Citas.FindAsync(id);
            if (cita == null)
                return NotFound();

            _context.Citas.Remove(cita);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}