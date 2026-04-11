namespace HospitalAPI.DTOs
{
    public class PacienteDTO
    {
        public int IdPaciente { get; set; }
        public string Nombre { get; set; }
        public string Apellido { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public string Telefono { get; set; }
        public string Email { get; set; }
    }

    public class PacienteDTOWithCitas : PacienteDTO
    {
        public List<CitaSimpleDTO> Citas { get; set; } = new();
    }
}
