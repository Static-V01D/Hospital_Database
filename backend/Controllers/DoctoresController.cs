using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalAPI.Data;
using HospitalAPI.Models;

namespace HospitalAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DoctoresController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DoctoresController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/doctores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Doctor>>> GetDoctores()
        {
            return await _context.Doctores
                                 .Include(d => d.Especialidad)
                                 .Include(d => d.Citas)
                                 .ToListAsync();
        }

        // GET: api/doctores/1
        [HttpGet("{id}")]
        public async Task<ActionResult<Doctor>> GetDoctor(int id)
        {
            var doctor = await _context.Doctores
                                       .Include(d => d.Especialidad)
                                       .Include(d => d.Citas)
                                       .FirstOrDefaultAsync(d => d.IdDoctor == id);

            if (doctor == null)
                return NotFound();

            return doctor;
        }

        // POST: api/doctores
        [HttpPost]
        public async Task<ActionResult<Doctor>> PostDoctor(Doctor doctor)
        {
            _context.Doctores.Add(doctor);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetDoctor), new { id = doctor.IdDoctor }, doctor);
        }

        // PUT: api/doctores/1
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDoctor(int id, Doctor doctor)
        {
            if (id != doctor.IdDoctor)
                return BadRequest();

            _context.Entry(doctor).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/doctores/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDoctor(int id)
        {
            var doctor = await _context.Doctores.FindAsync(id);
            if (doctor == null)
                return NotFound();

            _context.Doctores.Remove(doctor);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}