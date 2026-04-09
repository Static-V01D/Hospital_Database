using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalAPI.Models
{
    [Table("paciente")] // nombre de la tabla en MySQL
    public class Paciente
    {
        [Key]
        [Column("id_paciente")] // nombre real en MySQL
        public int IdPaciente { get; set; }

        [Column("nombre")]
        public string Nombre { get; set; }

        [Column("apellido")]
        public string Apellido { get; set; }

        [Column("fecha_nacimiento")]
        public DateTime? FechaNacimiento { get; set; }

        [Column("telefono")]
        public string Telefono { get; set; }

        [Column("email")]
        public string Email { get; set; }

        public List<Cita>? Citas { get; set; }
    }
}