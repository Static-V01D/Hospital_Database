using Microsoft.EntityFrameworkCore;
using HospitalAPI.Models;

namespace HospitalAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        // Constructor
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // ============================================
        // TABLAS (DBSETS)
        // ============================================

        public DbSet<Paciente> Pacientes { get; set; }
        public DbSet<Doctor> Doctores { get; set; }
        public DbSet<Especialidad> Especialidades { get; set; }
        public DbSet<Cita> Citas { get; set; }
        public DbSet<Consulta> Consultas { get; set; }

        // ============================================
        // CONFIGURACIÓN AVANZADA (FLUENT API)
        // ============================================

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Relación 1:1 entre Cita y Consulta
            modelBuilder.Entity<Cita>()
                .HasOne(c => c.Consulta)
                .WithOne(c => c.Cita)
                .HasForeignKey<Consulta>(c => c.IdCita);

            // Relación Paciente → Citas
            modelBuilder.Entity<Paciente>()
                .HasMany(p => p.Citas)
                .WithOne(c => c.Paciente)
                .HasForeignKey(c => c.IdPaciente);

            // Relación Doctor → Citas
            modelBuilder.Entity<Doctor>()
                .HasMany(d => d.Citas)
                .WithOne(c => c.Doctor)
                .HasForeignKey(c => c.IdDoctor);
        }
    }
}