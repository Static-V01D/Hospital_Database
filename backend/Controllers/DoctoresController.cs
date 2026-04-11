using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HospitalAPI.Data;
using HospitalAPI.Models;
using HospitalAPI.DTOs;

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

        private DoctorDTO MapToDoctorDTO(Doctor doctor)
        {
            if (doctor == null) return null;

            return new DoctorDTO
            {
                IdDoctor = doctor.IdDoctor,
                Nombre = doctor.Nombre,
                Apellido = doctor.Apellido,
                IdEspecialidad = doctor.IdEspecialidad,
                Especialidad = doctor.Especialidad != null ? new EspecialidadDTO
                {
                    IdEspecialidad = doctor.Especialidad.IdEspecialidad,
                    Nombre = doctor.Especialidad.Nombre
                } : null
            };
        }

        // GET: api/doctores
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DoctorDTO>>> GetDoctores()
        {
            var doctores = await _context.Doctores
                                 .Include(d => d.Especialidad)
                                 .ToListAsync();

            return doctores.Select(MapToDoctorDTO).ToList();
        }

        // GET: api/doctores/1
        [HttpGet("{id}")]
        public async Task<ActionResult<DoctorDTO>> GetDoctor(int id)
        {
            var doctor = await _context.Doctores
                                       .Include(d => d.Especialidad)
                                       .FirstOrDefaultAsync(d => d.IdDoctor == id);

            if (doctor == null)
                return NotFound();

            return MapToDoctorDTO(doctor);
        }

        // POST: api/doctores
        [HttpPost]
        public async Task<ActionResult<DoctorDTO>> PostDoctor(Doctor doctor)
        {
            _context.Doctores.Add(doctor);
            await _context.SaveChangesAsync();
            
            var createdDoctor = await _context.Doctores
                                             .Include(d => d.Especialidad)
                                             .FirstOrDefaultAsync(d => d.IdDoctor == doctor.IdDoctor);

            return CreatedAtAction(nameof(GetDoctor), new { id = doctor.IdDoctor }, MapToDoctorDTO(createdDoctor));
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