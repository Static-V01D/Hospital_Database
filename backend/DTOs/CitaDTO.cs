namespace HospitalAPI.DTOs
{
    public class CitaDTO
    {
        public int IdCita { get; set; }
        public int IdPaciente { get; set; }
        public int IdDoctor { get; set; }
        public DateTime Fecha { get; set; }
        public TimeSpan Hora { get; set; }
        public string Motivo { get; set; }
        public PacienteDTO Paciente { get; set; }
        public DoctorSimpleDTO Doctor { get; set; }
    }

    public class CitaSimpleDTO
    {
        public int IdCita { get; set; }
        public int IdPaciente { get; set; }
        public int IdDoctor { get; set; }
        public DateTime Fecha { get; set; }
        public TimeSpan Hora { get; set; }
        public string Motivo { get; set; }
    }

    public class CitaDTOWithConsulta : CitaDTO
    {
        public ConsultaSimpleDTO Consulta { get; set; }
    }
}
