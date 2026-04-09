using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalAPI.Models
{
    [Table("especialidad")]
    public class Especialidad
    {
        [Key]
        [Column("id_especialidad")]
        public int IdEspecialidad { get; set; }

        [Column("nombre")]
        public string Nombre { get; set; }

        // Relación con Doctor (1:N)
        public List<Doctor>? Doctores { get; set; }
    }
}