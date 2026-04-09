using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalAPI.Models
{
    [Table("consulta")]
    public class Consulta
    {
        [Key]
        [Column("id_consulta")]
        public int IdConsulta { get; set; }

        [Column("id_cita")]
        public int IdCita { get; set; }

        [Column("diagnostico")]
        public string Diagnostico { get; set; }

        [Column("observaciones")]
        public string Observaciones { get; set; }

        // Relación con Cita
        [ForeignKey("IdCita")]
        public Cita? Cita { get; set; }
    }
}