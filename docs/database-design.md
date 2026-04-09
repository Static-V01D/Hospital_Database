🏥 Hospital Management System — Database Design
📌 Objetivo

Diseñar una base de datos relacional que modele el flujo básico de un hospital:

Gestión de pacientes
Gestión de doctores
Citas médicas
Consultas (diagnóstico)
🧠 Entidades principales
Entidad	Descripción
Paciente	Persona que recibe atención médica
Doctor	Profesional médico
Especialidad	Área médica del doctor
Cita	Encuentro programado
Consulta	Resultado clínico de la cita
🔗 Relaciones
Un Paciente tiene muchas Citas
Un Doctor atiende muchas Citas
Una Cita genera una Consulta
Un Doctor pertenece a una Especialidad


📊 Diagrama ER
Paciente (1) ─────────── (N) Cita (N) ─────────── (1) Doctor
                                │
                                │
                                ▼
                           Consulta (1)
                                
Doctor (N) ─────────── (1) Especialidad


🧱 Diseño de tablas
Paciente
Representa a cada persona atendida
ID numérico para eficiencia y consistencia

Campos:

id_paciente (PK)
nombre
apellido
fecha_nacimiento
telefono
email
Especialidad
Evita duplicar texto como "Cardiología"
Doctor
Relacionado con Especialidad
Permite filtrar doctores por área médica
Cita
Es el centro del sistema
Conecta paciente y doctor
Consulta
Representa el resultado médico
⚠️ Decisiones importantes
1. Uso de IDs numéricos
Más rápidos
Estables
Evitan conflictos
2. Separación de Consulta y Cita
Permite citas canceladas sin diagnóstico
Refleja mejor el mundo real
3. Normalización
Evita duplicación de datos
Mejora consistencia
🚀 Estado actual

Este diseño representa el MVP del sistema hospitalario.

En futuras iteraciones se añadirá:

Tratamientos
Medicamentos
Facturación
Hospitalización