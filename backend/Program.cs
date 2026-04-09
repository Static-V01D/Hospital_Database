// ============================================
// IMPORTS
// ============================================

using HospitalAPI.Data;
using Microsoft.EntityFrameworkCore;

// ============================================
// CREACIÓN DEL BUILDER
// ============================================

var builder = WebApplication.CreateBuilder(args);

// ============================================
// CONFIGURACIÓN DE SERVICIOS (DEPENDENCY INJECTION)
// ============================================

// 🔹 Agregar soporte para Controllers (API REST)
builder.Services.AddControllers();

// 🔹 Configurar Swagger (documentación automática de la API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 🔹 Configurar conexión a MySQL usando Entity Framework
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySQL(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// 🔹 Configurar CORS (permite que React se conecte al backend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173") // URL de React (Vite)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

// ============================================
// CREAR LA APP
// ============================================

var app = builder.Build();

// ============================================
// CONFIGURACIÓN DEL PIPELINE HTTP
// ============================================

// 🔹 Swagger solo en desarrollo (recomendado)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 🔹 Redirección HTTPS
app.UseHttpsRedirection();

// 🔹 Habilitar CORS
app.UseCors("AllowReactApp");

// 🔹 Habilitar autorización (aunque aún no implementamos auth)
app.UseAuthorization();

// 🔹 Mapear controllers (activar endpoints)
app.MapControllers();

// ============================================
// EJECUTAR LA APP
// ============================================

app.Run();