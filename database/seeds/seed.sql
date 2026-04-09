USE hospital_db;

-- ============================================
-- INSERTAR ESPECIALIDADES
-- ============================================

INSERT INTO Especialidad (nombre) VALUES
('Cardiologia'),
('Pediatria'),
('Neurologia');

-- ============================================
-- INSERTAR PACIENTES
-- ============================================

INSERT INTO Paciente (nombre, apellido, telefono, email) VALUES
('Luis', 'Perez', '7875551234', 'luis@email.com'),
('Ana', 'Lopez', '7874442222', 'ana@email.com');

-- ============================================
-- INSERTAR DOCTORES
-- ============================================

INSERT INTO Doctor (nombre, apellido, id_especialidad) VALUES
('Carlos', 'Rodriguez', 1),
('Maria', 'Santos', 2);

-- ============================================
-- INSERTAR CITAS
-- ============================================

INSERT INTO Cita (id_paciente, id_doctor, fecha, hora, motivo) VALUES
(1, 1, '2026-04-10', '10:00:00', 'Chequeo general'),
(2, 2, '2026-04-11', '11:30:00', 'Consulta pediatrica');

-- ============================================
-- INSERTAR CONSULTAS
-- ============================================

INSERT INTO Consulta (id_cita, diagnostico, observaciones) VALUES
(1, 'Hipertension leve', 'Se recomienda dieta baja en sodio'),
(2, 'Gripe comun', 'Reposo y liquidos');