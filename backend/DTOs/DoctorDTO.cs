namespace HospitalAPI.DTOs
{
    public class DoctorDTO
    {
        public int IdDoctor { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public int IdEspecialidad { get; set; }
        public EspecialidadDTO Especialidad { get; set; }
    }

    public class DoctorSimpleDTO
    {
        public int IdDoctor { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public int IdEspecialidad { get; set; }
    }

    public class DoctorDTOWithCitas : DoctorDTO
    {
        public List<CitaSimpleDTO> Citas { get; set; } = new();
    }
}
