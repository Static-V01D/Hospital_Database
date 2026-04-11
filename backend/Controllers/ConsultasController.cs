using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalAPI.Data;
using HospitalAPI.Models;
using HospitalAPI.DTOs;

namespace HospitalAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConsultasController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ConsultasController(ApplicationDbContext context)
        {
            _context = context;
        }

        private ConsultaDTO MapToConsultaDTO(Consulta consulta)
        {
            if (consulta == null) return null;

            return new ConsultaDTO
            {
                IdConsulta = consulta.IdConsulta,
                IdCita = consulta.IdCita,
                Diagnostico = consulta.Diagnostico,
                Observaciones = consulta.Observaciones
            };
        }

        // GET: api/consultas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ConsultaDTO>>> GetConsultas()
        {
            var consultas = await _context.Consultas.ToListAsync();
            return consultas.Select(MapToConsultaDTO).ToList();
        }

        // GET: api/consultas/1
        [HttpGet("{id}")]
        public async Task<ActionResult<ConsultaDTO>> GetConsulta(int id)
        {
            var consulta = await _context.Consultas
                                         .FirstOrDefaultAsync(c => c.IdConsulta == id);

            if (consulta == null)
                return NotFound();

            return MapToConsultaDTO(consulta);
        }

        // POST: api/consultas
        [HttpPost]
        public async Task<ActionResult<ConsultaDTO>> PostConsulta(Consulta consulta)
        {
            _context.Consultas.Add(consulta);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetConsulta), new { id = consulta.IdConsulta }, MapToConsultaDTO(consulta));
        }

        // PUT: api/consultas/1
        [HttpPut("{id}")]
        public async Task<IActionResult> PutConsulta(int id, Consulta consulta)
        {
            if (id != consulta.IdConsulta)
                return BadRequest();

            _context.Entry(consulta).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/consultas/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConsulta(int id)
        {
            var consulta = await _context.Consultas.FindAsync(id);
            if (consulta == null)
                return NotFound();

            _context.Consultas.Remove(consulta);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}