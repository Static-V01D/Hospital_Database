-- ============================================
-- Ver todas las citas con datos completos
-- ============================================

SELECT 
    p.nombre AS paciente,
    d.nombre AS doctor,
    e.nombre AS especialidad,
    c.fecha,
    c.hora
FROM Cita c
JOIN Paciente p ON c.id_paciente = p.id_paciente
JOIN Doctor d ON c.id_doctor = d.id_doctor
JOIN Especialidad e ON d.id_especialidad = e.id_especialidad;

-- ============================================
-- Ver consultas medicas
-- ============================================

SELECT 
    p.nombre AS paciente,
    co.diagnostico,
    co.observaciones
FROM Consulta co
JOIN Cita c ON co.id_cita = c.id_cita
JOIN Paciente p ON c.id_paciente = p.id_paciente;

-- ============================================
-- Ver doctores con especialidad
-- ============================================

SELECT 
    d.nombre,
    d.apellido,
    e.nombre AS especialidad
FROM Doctor d
JOIN Especialidad e ON d.id_especialidad = e.id_especialidad;
-- ============================================
-- Conteo de filas por tabla
-- ============================================

SELECT
    (SELECT count(*) FROM especialidad) AS especialidades,
    (SELECT count(*) FROM doctor)       AS doctores,
    (SELECT count(*) FROM paciente)     AS pacientes,
    (SELECT count(*) FROM cita)         AS citas,
    (SELECT count(*) FROM consulta)     AS consultas;

-- ============================================
-- Integridad: ambas consultas deben devolver 0 filas
-- ============================================

-- Doctor con dos citas a la misma hora
SELECT id_doctor, fecha, hora, count(*)
FROM cita
GROUP BY id_doctor, fecha, hora
HAVING count(*) > 1;

-- Paciente con dos citas a la misma hora
SELECT id_paciente, fecha, hora, count(*)
FROM cita
GROUP BY id_paciente, fecha, hora
HAVING count(*) > 1;
