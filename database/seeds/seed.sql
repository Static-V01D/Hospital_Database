-- ============================================
-- DATOS DE PRUEBA (PostgreSQL / Supabase)
-- ============================================
-- Llena las cinco tablas con datos ficticios pero realistas:
--   10 especialidades, 18 doctores, 60 pacientes,
--   ~200 citas (pasadas, de hoy y futuras) y ~130 consultas.
--
-- Las fechas de las citas son relativas al día en que se ejecuta el script
-- (desde 45 días atrás hasta 21 días adelante), así el panel siempre tiene
-- citas "de hoy", pasadas y próximas.
--
-- Ejecutar UNA sola vez sobre tablas vacías (después de schema/init.sql).
-- Para empezar de cero antes de volver a ejecutarlo:
--   truncate public.consulta, public.cita, public.doctor,
--            public.paciente, public.especialidad restart identity;

begin;

-- ============================================
-- ESPECIALIDADES
-- ============================================

insert into public.especialidad (nombre) values
('Cardiología'),
('Pediatría'),
('Neurología'),
('Medicina Interna'),
('Dermatología'),
('Ginecología'),
('Ortopedia'),
('Oftalmología'),
('Psiquiatría'),
('Endocrinología');

-- ============================================
-- DOCTORES
-- ============================================

insert into public.doctor (nombre, apellido, id_especialidad)
select v.nombre, v.apellido, e.id_especialidad
from (values
    ( 1, 'Carlos',    'Rodríguez', 'Cardiología'),
    ( 2, 'María',     'Santos',    'Pediatría'),
    ( 3, 'Elena',     'Vázquez',   'Neurología'),
    ( 4, 'Javier',    'Morales',   'Medicina Interna'),
    ( 5, 'Patricia',  'Delgado',   'Dermatología'),
    ( 6, 'Laura',     'Meléndez',  'Ginecología'),
    ( 7, 'Roberto',   'Cintrón',   'Ortopedia'),
    ( 8, 'Verónica',  'Soto',      'Oftalmología'),
    ( 9, 'Daniel',    'Acevedo',   'Psiquiatría'),
    (10, 'Marisol',   'Vega',      'Endocrinología'),
    (11, 'Isabel',    'Colón',     'Cardiología'),
    (12, 'Fernando',  'Ramos',     'Pediatría'),
    (13, 'Ricardo',   'Maldonado', 'Neurología'),
    (14, 'Carmen',    'Figueroa',  'Medicina Interna'),
    (15, 'Héctor',    'Nieves',    'Medicina Interna'),
    (16, 'Adriana',   'Cruz',      'Ginecología'),
    (17, 'Andrés',    'Pagán',     'Ortopedia'),
    (18, 'Natalia',   'Rosario',   'Psiquiatría')
) as v (orden, nombre, apellido, especialidad)
join public.especialidad e on e.nombre = v.especialidad
order by v.orden;

-- ============================================
-- PACIENTES
-- ============================================
-- "grupo" solo se usa en este script para asignar citas con sentido
-- (niños → Pediatría, mujeres adultas → Ginecología). No se guarda.

create temp table _pacientes (
    orden            integer,
    grupo            text,
    nombre           text,
    apellido         text,
    fecha_nacimiento date,
    telefono         text,
    email            text
) on commit drop;

insert into _pacientes values
-- Niños y adolescentes
( 1, 'nino',   'Sofía',     'Rivera',       '2015-06-21', '7875550101', 'sofia.rivera@example.com'),
( 2, 'nino',   'Diego',     'Hernández',    '2018-02-10', '7875550102', 'diego.hernandez@example.com'),
( 3, 'nino',   'Valeria',   'Ortiz',        '2012-09-03', '9395550103', 'valeria.ortiz@example.com'),
( 4, 'nino',   'Mateo',     'Díaz',         '2020-11-28', '7875550104', 'mateo.diaz@example.com'),
( 5, 'nino',   'Camila',    'Torres',       '2016-04-15', '7875550105', 'camila.torres@example.com'),
( 6, 'nino',   'Sebastián', 'Reyes',        '2011-01-07', '9395550106', 'sebastian.reyes@example.com'),
( 7, 'nino',   'Isabella',  'Vargas',       '2022-07-19', '7875550107', 'isabella.vargas@example.com'),
( 8, 'nino',   'Adrián',    'Marrero',      '2014-12-30', '7875550108', 'adrian.marrero@example.com'),
( 9, 'nino',   'Emma',      'Quiñones',     '2019-03-25', '9395550109', 'emma.quinones@example.com'),
(10, 'nino',   'Lucas',     'Ayala',        '2017-08-12', '7875550110', 'lucas.ayala@example.com'),
(11, 'nino',   'Mía',       'Carrasquillo', '2023-05-02', '7875550111', 'mia.carrasquillo@example.com'),
(12, 'nino',   'Gabriel',   'Otero',        '2013-10-18', '9395550112', 'gabriel.otero@example.com'),
-- Mujeres adultas
(13, 'mujer',  'Ana',       'López',        '1992-11-02', '7875550113', 'ana.lopez@example.com'),
(14, 'mujer',  'Gabriela',  'Ortiz',        '1979-09-09', '7875550114', 'gabriela.ortiz@example.com'),
(15, 'mujer',  'Carmen',    'Rivera',       '1955-03-22', '7875550115', 'carmen.rivera@example.com'),
(16, 'mujer',  'Rosa',      'Martínez',     '1948-07-14', '9395550116', 'rosa.martinez@example.com'),
(17, 'mujer',  'Luz',       'González',     '1963-12-01', '7875550117', 'luz.gonzalez@example.com'),
(18, 'mujer',  'Yolanda',   'Pérez',        '1971-05-30', '7875550118', 'yolanda.perez@example.com'),
(19, 'mujer',  'Wanda',     'Sánchez',      '1984-02-17', '9395550119', 'wanda.sanchez@example.com'),
(20, 'mujer',  'Ivette',    'Ramírez',      '1990-08-26', '7875550120', 'ivette.ramirez@example.com'),
(21, 'mujer',  'Marta',     'Flores',       '1967-10-11', '7875550121', 'marta.flores@example.com'),
(22, 'mujer',  'Sonia',     'Medina',       '1959-01-05', '9395550122', 'sonia.medina@example.com'),
(23, 'mujer',  'Glorimar',  'Rosado',       '1988-06-08', '7875550123', 'glorimar.rosado@example.com'),
(24, 'mujer',  'Brenda',    'Castro',       '1995-04-20', '7875550124', 'brenda.castro@example.com'),
(25, 'mujer',  'Lourdes',   'Burgos',       '1952-09-27', '9395550125', 'lourdes.burgos@example.com'),
(26, 'mujer',  'Zoraida',   'Negrón',       '1976-03-03', '7875550126', 'zoraida.negron@example.com'),
(27, 'mujer',  'Keila',     'Alvarado',     '2001-12-15', '7875550127', 'keila.alvarado@example.com'),
(28, 'mujer',  'Paola',     'Santiago',     '1998-07-07', '9395550128', 'paola.santiago@example.com'),
(29, 'mujer',  'Migdalia',  'Cordero',      '1944-11-19', '7875550129', 'migdalia.cordero@example.com'),
(30, 'mujer',  'Diana',     'Robles',       '1982-01-24', '7875550130', 'diana.robles@example.com'),
(31, 'mujer',  'Teresa',    'Lebrón',       '1969-06-16', '9395550131', 'teresa.lebron@example.com'),
(32, 'mujer',  'Jessica',   'Matos',        '1993-10-29', '7875550132', 'jessica.matos@example.com'),
(33, 'mujer',  'Nilda',     'Fuentes',      '1957-04-08', '7875550133', 'nilda.fuentes@example.com'),
(34, 'mujer',  'Alondra',   'Báez',         '2004-02-13', '9395550134', 'alondra.baez@example.com'),
(35, 'mujer',  'Mariela',   'Collazo',      '1986-08-31', '7875550135', 'mariela.collazo@example.com'),
(36, 'mujer',  'Evelyn',    'Serrano',      '1974-05-06', '7875550136', 'evelyn.serrano@example.com'),
-- Hombres adultos
(37, 'hombre', 'Luis',      'Pérez',        '1986-03-14', '7875550137', 'luis.perez@example.com'),
(38, 'hombre', 'Miguel',    'Torres',       '1958-01-30', '9395550138', 'miguel.torres@example.com'),
(39, 'hombre', 'José',      'García',       '1965-07-04', '7875550139', 'jose.garcia@example.com'),
(40, 'hombre', 'Juan',      'Rodríguez',    '1949-10-12', '7875550140', 'juan.rodriguez@example.com'),
(41, 'hombre', 'Pedro',     'Rivera',       '1972-02-28', '9395550141', 'pedro.rivera@example.com'),
(42, 'hombre', 'Ángel',     'Cruz',         '1980-09-15', '7875550142', 'angel.cruz@example.com'),
(43, 'hombre', 'Rafael',    'Gómez',        '1991-06-03', '7875550143', 'rafael.gomez@example.com'),
(44, 'hombre', 'Víctor',    'Morales',      '1954-12-21', '9395550144', 'victor.morales@example.com'),
(45, 'hombre', 'Edwin',     'Jiménez',      '1977-04-09', '7875550145', 'edwin.jimenez@example.com'),
(46, 'hombre', 'Orlando',   'Ruiz',         '1968-11-17', '7875550146', 'orlando.ruiz@example.com'),
(47, 'hombre', 'Wilfredo',  'Álvarez',      '1943-05-25', '9395550147', 'wilfredo.alvarez@example.com'),
(48, 'hombre', 'Ramón',     'Mercado',      '1961-08-08', '7875550148', 'ramon.mercado@example.com'),
(49, 'hombre', 'Kevin',     'Lugo',         '2000-01-19', '7875550149', 'kevin.lugo@example.com'),
(50, 'hombre', 'Christian', 'Vélez',        '1996-03-11', '9395550150', 'christian.velez@example.com'),
(51, 'hombre', 'Jorge',     'Padilla',      '1983-07-27', '7875550151', 'jorge.padilla@example.com'),
(52, 'hombre', 'Félix',     'Cabrera',      '1956-02-02', '7875550152', 'felix.cabrera@example.com'),
(53, 'hombre', 'Emanuel',   'Rojas',        '1999-09-23', '9395550153', 'emanuel.rojas@example.com'),
(54, 'hombre', 'Samuel',    'Miranda',      '1989-12-06', '7875550154', 'samuel.miranda@example.com'),
(55, 'hombre', 'Antonio',   'Guzmán',       '1947-06-29', '7875550155', 'antonio.guzman@example.com'),
(56, 'hombre', 'Omar',      'Feliciano',    '1975-10-01', '9395550156', 'omar.feliciano@example.com'),
(57, 'hombre', 'Ismael',    'Pacheco',      '1970-01-13', '7875550157', 'ismael.pacheco@example.com'),
(58, 'hombre', 'Julio',     'Montañez',     '1962-04-18', '7875550158', 'julio.montanez@example.com'),
(59, 'hombre', 'Nelson',    'Arroyo',       '1985-11-05', '9395550159', 'nelson.arroyo@example.com'),
(60, 'hombre', 'Alexis',    'Camacho',      '1994-08-14', '7875550160', 'alexis.camacho@example.com');

insert into public.paciente (nombre, apellido, fecha_nacimiento, telefono, email)
select nombre, apellido, fecha_nacimiento, telefono, email
from _pacientes
order by orden;

-- ============================================
-- CASOS CLÍNICOS (motivo → diagnóstico → observaciones)
-- ============================================
-- Catálogo temporal para que cada cita tenga un motivo propio de la
-- especialidad del doctor y cada consulta un diagnóstico coherente.

create temp table _casos (
    especialidad  text,
    n             integer,
    motivo        text,
    diagnostico   text,
    observaciones text
) on commit drop;

insert into _casos values
('Cardiología', 1, 'Dolor torácico al esfuerzo', 'Angina estable', 'Se ordena prueba de esfuerzo y se inicia aspirina en dosis baja.'),
('Cardiología', 2, 'Control de presión arterial', 'Hipertensión arterial controlada', 'Continuar tratamiento actual. Dieta baja en sodio.'),
('Cardiología', 3, 'Palpitaciones frecuentes', 'Extrasístoles ventriculares benignas', 'Reducir cafeína. Holter de 24 horas si persisten.'),
('Cardiología', 4, 'Seguimiento posinfarto', 'Cardiopatía isquémica estable', 'Buena evolución. Continuar rehabilitación cardíaca.'),
('Cardiología', 5, 'Falta de aire al caminar', 'Insuficiencia cardíaca leve', 'Se ajusta diurético. Ecocardiograma en 4 semanas.'),

('Pediatría', 1, 'Fiebre y dolor de garganta', 'Faringitis estreptocócica', 'Amoxicilina por 10 días. Hidratación abundante.'),
('Pediatría', 2, 'Vacunación de rutina', 'Niño sano', 'Vacunas al día. Próxima visita en 6 meses.'),
('Pediatría', 3, 'Tos persistente', 'Bronquiolitis leve', 'Nebulizaciones con solución salina. Vigilar dificultad respiratoria.'),
('Pediatría', 4, 'Control de crecimiento', 'Crecimiento y desarrollo adecuados', 'Peso y talla en percentiles normales.'),
('Pediatría', 5, 'Dolor de oído', 'Otitis media aguda', 'Antibiótico por 7 días y analgésico según necesidad.'),

('Neurología', 1, 'Migrañas recurrentes', 'Migraña sin aura', 'Se inicia tratamiento preventivo. Llevar diario de cefaleas.'),
('Neurología', 2, 'Mareos y vértigo', 'Vértigo posicional paroxístico benigno', 'Maniobras de reposicionamiento. Reevaluar en 2 semanas.'),
('Neurología', 3, 'Hormigueo en las manos', 'Síndrome del túnel carpiano', 'Férula nocturna. Estudio de conducción nerviosa.'),
('Neurología', 4, 'Seguimiento de epilepsia', 'Epilepsia controlada', 'Sin crisis en 6 meses. Mantener dosis actual.'),
('Neurología', 5, 'Pérdida de memoria reciente', 'Deterioro cognitivo leve', 'Se ordenan pruebas neuropsicológicas y laboratorios.'),

('Medicina Interna', 1, 'Chequeo general anual', 'Paciente saludable', 'Laboratorios dentro de límites normales. Repetir en 12 meses.'),
('Medicina Interna', 2, 'Seguimiento de laboratorios', 'Hipercolesterolemia', 'Se inicia estatina. Dieta y ejercicio regular.'),
('Medicina Interna', 3, 'Cansancio constante', 'Anemia ferropénica', 'Suplemento de hierro por 3 meses. Repetir hemograma.'),
('Medicina Interna', 4, 'Síntomas de gripe', 'Influenza', 'Reposo, líquidos y antipirético. Regresar si hay dificultad respiratoria.'),
('Medicina Interna', 5, 'Dolor abdominal', 'Gastritis', 'Inhibidor de bomba de protones por 4 semanas. Evitar irritantes.'),

('Dermatología', 1, 'Erupción en la piel', 'Dermatitis de contacto', 'Crema de hidrocortisona. Evitar el agente irritante.'),
('Dermatología', 2, 'Revisión de lunares', 'Nevos benignos', 'Sin cambios sospechosos. Control anual.'),
('Dermatología', 3, 'Acné persistente', 'Acné vulgar moderado', 'Retinoide tópico por la noche. Reevaluar en 8 semanas.'),
('Dermatología', 4, 'Picazón en el cuero cabelludo', 'Dermatitis seborreica', 'Champú con ketoconazol dos veces por semana.'),
('Dermatología', 5, 'Manchas en la piel', 'Melasma', 'Protector solar diario y crema despigmentante.'),

('Ginecología', 1, 'Examen ginecológico anual', 'Examen normal', 'Citología tomada. Resultados en 2 semanas.'),
('Ginecología', 2, 'Control prenatal', 'Embarazo de evolución normal', 'Signos vitales normales. Próximo control en 4 semanas.'),
('Ginecología', 3, 'Dolor menstrual intenso', 'Dismenorrea primaria', 'Antiinflamatorio durante el ciclo. Sonograma pélvico.'),
('Ginecología', 4, 'Irregularidad menstrual', 'Síndrome de ovario poliquístico', 'Se ordena perfil hormonal. Orientación nutricional.'),
('Ginecología', 5, 'Consulta de planificación familiar', 'Orientación anticonceptiva', 'Se discuten opciones. Paciente elige método oral.'),

('Ortopedia', 1, 'Dolor de rodilla', 'Tendinitis rotuliana', 'Reposo relativo, hielo y terapia física.'),
('Ortopedia', 2, 'Dolor lumbar', 'Lumbalgia mecánica', 'Ejercicios de fortalecimiento. Evitar cargar peso.'),
('Ortopedia', 3, 'Torcedura de tobillo', 'Esguince de tobillo grado I', 'Vendaje, elevación y reposo por una semana.'),
('Ortopedia', 4, 'Seguimiento de fractura', 'Fractura de radio en consolidación', 'Radiografía muestra buena alineación. Retirar yeso en 2 semanas.'),
('Ortopedia', 5, 'Dolor de hombro', 'Tendinitis del manguito rotador', 'Antiinflamatorio y terapia física por 6 semanas.'),

('Oftalmología', 1, 'Visión borrosa', 'Miopía', 'Se actualiza receta de espejuelos.'),
('Oftalmología', 2, 'Examen de la vista anual', 'Agudeza visual normal', 'Sin cambios. Control en un año.'),
('Oftalmología', 3, 'Ojos rojos e irritados', 'Conjuntivitis alérgica', 'Gotas antihistamínicas. Evitar frotarse los ojos.'),
('Oftalmología', 4, 'Control de presión ocular', 'Glaucoma en tratamiento', 'Presión intraocular estable. Continuar gotas.'),
('Oftalmología', 5, 'Resequedad en los ojos', 'Síndrome de ojo seco', 'Lágrimas artificiales cuatro veces al día.'),

('Psiquiatría', 1, 'Ansiedad y dificultad para dormir', 'Trastorno de ansiedad generalizada', 'Se recomienda psicoterapia e higiene del sueño.'),
('Psiquiatría', 2, 'Seguimiento de tratamiento', 'Depresión en remisión', 'Buena respuesta. Mantener medicamento actual.'),
('Psiquiatría', 3, 'Estado de ánimo decaído', 'Episodio depresivo leve', 'Se inicia psicoterapia. Reevaluar en 4 semanas.'),
('Psiquiatría', 4, 'Problemas de concentración', 'Trastorno por déficit de atención', 'Se discuten opciones de tratamiento y estrategias de organización.'),
('Psiquiatría', 5, 'Estrés laboral', 'Trastorno de adaptación', 'Técnicas de manejo de estrés. Seguimiento mensual.'),

('Endocrinología', 1, 'Control de diabetes', 'Diabetes tipo 2 controlada', 'Hemoglobina glicosilada en meta. Continuar metformina.'),
('Endocrinología', 2, 'Revisión de tiroides', 'Hipotiroidismo', 'Se ajusta dosis de levotiroxina. Laboratorios en 6 semanas.'),
('Endocrinología', 3, 'Aumento de peso inexplicado', 'Resistencia a la insulina', 'Plan de alimentación y actividad física.'),
('Endocrinología', 4, 'Niveles altos de azúcar', 'Prediabetes', 'Cambios en estilo de vida. Repetir glucosa en 3 meses.'),
('Endocrinología', 5, 'Seguimiento de osteoporosis', 'Osteoporosis en tratamiento', 'Continuar calcio y vitamina D. Densitometría anual.');

-- ============================================
-- CITAS
-- ============================================
-- Agenda posible: cada doctor, de lunes a sábado, cada 30 minutos de
-- 8:00 a 15:30. De esa agenda se elige una fracción fija mediante md5
-- (pseudoaleatorio pero repetible). Hoy siempre se incluye, y con más
-- citas, para que el panel tenga actividad el día de la prueba.
-- Garantías: un doctor nunca tiene dos citas a la misma hora (cada
-- espacio de agenda es único) ni un paciente (distinct on).

with dias as (
    select d::date as fecha
    from generate_series(current_date - 45, current_date + 21, interval '1 day') as d
    where extract(isodow from d) < 7 or d::date = current_date
),
agenda as (
    select
        di.fecha,
        (time '08:00' + s.slot * interval '30 minutes')::time as hora,
        doc.id_doctor,
        e.nombre as especialidad,
        ('x' || substr(md5(di.fecha::text || '/' || doc.id_doctor::text || '/' || s.slot::text), 1, 7))::bit(28)::int as azar
    from dias di
    cross join public.doctor doc
    join public.especialidad e on e.id_especialidad = doc.id_especialidad
    cross join generate_series(0, 15) as s (slot)
),
elegidas as (
    select *
    from agenda
    where azar % 1000 < case when fecha = current_date then 60 else 11 end
),
con_paciente as (
    select el.*, p.id_paciente
    from elegidas el
    cross join lateral (
        select pa.id_paciente
        from public.paciente pa
        join _pacientes tp on tp.email = pa.email
        where tp.grupo = any (
            case el.especialidad
                when 'Pediatría'   then array['nino']
                when 'Ginecología' then array['mujer']
                else array['mujer', 'hombre']
            end)
        order by md5(pa.id_paciente::text || '/' || el.fecha::text || '/' || el.hora::text || '/' || el.id_doctor::text)
        limit 1
    ) p
),
sin_choques as (
    select distinct on (fecha, hora, id_paciente) *
    from con_paciente
    order by fecha, hora, id_paciente, id_doctor
)
insert into public.cita (id_paciente, id_doctor, fecha, hora, motivo)
select sc.id_paciente, sc.id_doctor, sc.fecha, sc.hora, caso.motivo
from sin_choques sc
cross join lateral (
    select c.motivo
    from _casos c
    where c.especialidad = sc.especialidad
    order by md5(c.n::text || '/' || sc.fecha::text || '/' || sc.hora::text || '/' || sc.id_doctor::text)
    limit 1
) caso
order by sc.fecha, sc.hora, sc.id_doctor;

-- ============================================
-- CONSULTAS
-- ============================================
-- Solo para citas ya atendidas: ~90 % de las de días anteriores y parte
-- de las de esta mañana. El resto queda "pendiente de registro", y las
-- futuras no tienen consulta. El diagnóstico corresponde al motivo.

insert into public.consulta (id_cita, diagnostico, observaciones)
select c.id_cita, cs.diagnostico, cs.observaciones
from public.cita c
join public.doctor d on d.id_doctor = c.id_doctor
join public.especialidad e on e.id_especialidad = d.id_especialidad
join _casos cs on cs.especialidad = e.nombre and cs.motivo = c.motivo
cross join lateral (
    select ('x' || substr(md5('consulta/' || c.id_cita::text), 1, 7))::bit(28)::int % 100 as azar
) r
where (c.fecha < current_date and r.azar < 90)
   or (c.fecha = current_date and c.hora < time '12:00' and r.azar < 60)
order by c.fecha, c.hora, c.id_cita;

commit;
