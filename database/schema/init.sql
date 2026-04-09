-- ============================================
-- CREACIÓN DE BASE DE DATOS
-- ============================================

CREATE DATABASE IF NOT EXISTS hospital_db;
USE hospital_db;

-- ============================================
-- TABLA: Especialidad
-- ============================================
-- Contiene las áreas médicas (Cardiología, etc.)

CREATE TABLE Especialidad (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- ============================================
-- TABLA: Paciente
-- ============================================
-- Representa a cada paciente del hospital

CREATE TABLE Paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    email VARCHAR(100)
);

-- ============================================
-- TABLA: Doctor
-- ============================================
-- Relacionado con Especialidad

CREATE TABLE Doctor (
    id_doctor INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    id_especialidad INT,
    
    -- Clave foránea
    FOREIGN KEY (id_especialidad)
    REFERENCES Especialidad(id_especialidad)
);

-- ============================================
-- TABLA: Cita
-- ============================================
-- Conecta Paciente y Doctor

CREATE TABLE Cita (
    id_cita INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    id_doctor INT,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT,

    FOREIGN KEY (id_paciente)
    REFERENCES Paciente(id_paciente),

    FOREIGN KEY (id_doctor)
    REFERENCES Doctor(id_doctor)
);

-- ============================================
-- TABLA: Consulta
-- ============================================
-- Resultado de la cita

CREATE TABLE Consulta (
    id_consulta INT AUTO_INCREMENT PRIMARY KEY,
    id_cita INT,
    diagnostico TEXT,
    observaciones TEXT,

    FOREIGN KEY (id_cita)
    REFERENCES Cita(id_cita)
);