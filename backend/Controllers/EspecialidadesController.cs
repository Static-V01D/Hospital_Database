using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalAPI.Data;
using HospitalAPI.Models;

namespace HospitalAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EspecialidadesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EspecialidadesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/especialidades
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Especialidad>>> GetEspecialidades()
        {
            return await _context.Especialidades
                                 .Include(e => e.Doctores)
                                 .ToListAsync();
        }

        // GET: api/especialidades/1
        [HttpGet("{id}")]
        public async Task<ActionResult<Especialidad>> GetEspecialidad(int id)
        {
            var especialidad = await _context.Especialidades
                                             .Include(e => e.Doctores)
                                             .FirstOrDefaultAsync(e => e.IdEspecialidad == id);

            if (especialidad == null)
                return NotFound();

            return especialidad;
        }

        // POST: api/especialidades
        [HttpPost]
        public async Task<ActionResult<Especialidad>> PostEspecialidad(Especialidad especialidad)
        {
            _context.Especialidades.Add(especialidad);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetEspecialidad), new { id = especialidad.IdEspecialidad }, especialidad);
        }

        // PUT: api/especialidades/1
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEspecialidad(int id, Especialidad especialidad)
        {
            if (id != especialidad.IdEspecialidad)
                return BadRequest();

            _context.Entry(especialidad).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/especialidades/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEspecialidad(int id)
        {
            var especialidad = await _context.Especialidades.FindAsync(id);
            if (especialidad == null)
                return NotFound();

            _context.Especialidades.Remove(especialidad);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}