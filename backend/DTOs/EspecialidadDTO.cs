namespace HospitalAPI.DTOs
{
    public class EspecialidadDTO
    {
        public int IdEspecialidad { get; set; }
        public string Nombre { get; set; }
    }

    public class EspecialidadDTOWithDoctores : EspecialidadDTO
    {
        public List<DoctorSimpleDTO> Doctores { get; set; } = new();
    }
}
