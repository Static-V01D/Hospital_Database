using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalAPI.Models
{
    [Table("doctor")]
    public class Doctor
    {
        [Key]
        [Column("id_doctor")]
        public int IdDoctor { get; set; }

        [Column("nombre")]
        public string Nombre { get; set; }

        [Column("apellido")]
        public string Apellido { get; set; }

        [Column("id_especialidad")]
        public int IdEspecialidad { get; set; }

        // Relación con Especialidad
        [ForeignKey("IdEspecialidad")]
        public Especialidad? Especialidad { get; set; }

        // Relación con Cita (1:N)
        public List<Cita>? Citas { get; set; }
    }
}