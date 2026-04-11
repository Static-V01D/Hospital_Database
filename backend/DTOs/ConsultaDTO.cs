namespace HospitalAPI.DTOs
{
    public class ConsultaDTO
    {
        public int IdConsulta { get; set; }
        public int IdCita { get; set; }
        public string Diagnostico { get; set; }
        public string Observaciones { get; set; }
    }

    public class ConsultaSimpleDTO
    {
        public int IdConsulta { get; set; }
        public int IdCita { get; set; }
        public string Diagnostico { get; set; }
        public string Observaciones { get; set; }
    }

    public class ConsultaDTOWithCita : ConsultaDTO
    {
        public CitaDTO Cita { get; set; }
    }
}
