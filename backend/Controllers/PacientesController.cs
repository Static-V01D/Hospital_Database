using Microsoft.AspNetCore.Mvc;
using HospitalAPI.Data;
using HospitalAPI.Models;
using HospitalAPI.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HospitalAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PacientesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PacientesController(ApplicationDbContext context)
        {
            _context = context;
        }

        private PacienteDTO MapToPacienteDTO(Paciente paciente)
        {
            if (paciente == null) return null;

            return new PacienteDTO
            {
                IdPaciente = paciente.IdPaciente,
                Nombre = paciente.Nombre,
                Apellido = paciente.Apellido,
                FechaNacimiento = paciente.FechaNacimiento,
                Telefono = paciente.Telefono,
                Email = paciente.Email
            };
        }

        // ============================================
        // GET: api/pacientes
        // Obtiene todos los pacientes
        // ============================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PacienteDTO>>> GetPacientes()
        {
            var pacientes = await _context.Pacientes.ToListAsync();
            return pacientes.Select(MapToPacienteDTO).ToList();
        }

        // ============================================
        // GET: api/pacientes/{id}
        // ============================================
        [HttpGet("{id}")]
        public async Task<ActionResult<PacienteDTO>> GetPaciente(int id)
        {
            var paciente = await _context.Pacientes.FindAsync(id);

            if (paciente == null)
                return NotFound();

            return MapToPacienteDTO(paciente);
        }

        // ============================================
        // POST: api/pacientes
        // ============================================
        [HttpPost]
        public async Task<ActionResult<PacienteDTO>> CreatePaciente(Paciente paciente)
        {
            _context.Pacientes.Add(paciente);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPaciente), new { id = paciente.IdPaciente }, MapToPacienteDTO(paciente));
        }

        // ============================================
        // DELETE: api/pacientes/{id}
        // ============================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePaciente(int id)
        {
            var paciente = await _context.Pacientes.FindAsync(id);

            if (paciente == null)
                return NotFound();

            _context.Pacientes.Remove(paciente);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}