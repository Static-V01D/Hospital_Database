using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalAPI.Models
{
    [Table("cita")]
    public class Cita
    {
        [Key]
        [Column("id_cita")]
        public int IdCita { get; set; }

        [Column("id_paciente")]
        public int IdPaciente { get; set; }

        [Column("id_doctor")]
        public int IdDoctor { get; set; }

        [Column("fecha")]
        public DateTime Fecha { get; set; }

        [Column("hora")]
        public TimeSpan Hora { get; set; }

        [Column("motivo")]
        public string Motivo { get; set; }

        // Relaciones
        [ForeignKey("IdPaciente")]
        public Paciente? Paciente { get; set; }

        [ForeignKey("IdDoctor")]
        public Doctor? Doctor { get; set; }

        // Relación 1:1 con Consulta
        public Consulta? Consulta { get; set; }
    }
}