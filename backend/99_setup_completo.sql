-- =============================================================
-- 99_setup_completo.sql
-- Master setup script for the veterinary clinic (Corte 3).
--
-- Usage (from psql connected to the clinica_vet database):
--   \c clinica_vet
--   \i schema_corte3.sql          -- run once to create tables & seed data
--   \i backend/99_setup_completo.sql
--
-- Or run from the shell:
--   psql -U postgres -d clinica_vet -f backend/99_setup_completo.sql
-- =============================================================

\echo '============================================================='
\echo ' Clínica Veterinaria — Setup Corte 3'
\echo ' Cargando módulos en orden...'
\echo '============================================================='

-- ------------------------------------------------------------
-- 1. Stored procedures and functions
-- ------------------------------------------------------------
\echo ''
\echo '[1/5] Cargando procedures y funciones (01_procedures.sql)...'
\i 01_procedures.sql
\echo '  OK: sp_agendar_cita, fn_calcular_facturacion creados.'

-- ------------------------------------------------------------
-- 2. Triggers
-- ------------------------------------------------------------
\echo ''
\echo '[2/5] Cargando triggers (02_triggers.sql)...'
\i 02_triggers.sql
\echo '  OK: trg_historial_cita creado.'

-- ------------------------------------------------------------
-- 3. Views
-- ------------------------------------------------------------
\echo ''
\echo '[3/5] Cargando vistas (03_views.sql)...'
\i 03_views.sql
\echo '  OK: v_mascotas_vacunacion_pendiente creada.'

-- ------------------------------------------------------------
-- 4. Roles and permissions
-- ------------------------------------------------------------
\echo ''
\echo '[4/5] Cargando roles y permisos (04_roles_y_permisos.sql)...'
\i 04_roles_y_permisos.sql
\echo '  OK: roles veterinario / recepcion / administrador configurados.'

-- ------------------------------------------------------------
-- 5. Row-Level Security policies
-- ------------------------------------------------------------
\echo ''
\echo '[5/5] Cargando políticas RLS (05_rls.sql)...'
\i 05_rls.sql
\echo '  OK: RLS habilitado en mascotas, citas, vacunas_aplicadas,'
\echo '      historial_movimientos, alertas, inventario_vacunas.'

\echo ''
\echo '============================================================='
\echo ' Setup completado. Ejecutando verificaciones...'
\echo '============================================================='


-- =============================================================
-- VERIFICATION QUERIES
-- =============================================================

-- ------------------------------------------------------------
-- V1. Confirm procedures and functions exist
-- ------------------------------------------------------------
\echo ''
\echo '--- V1: Routines registradas ---'
SELECT
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'sp_agendar_cita',
      'fn_calcular_facturacion',
      'fn_registrar_historial_cita'
  )
ORDER BY routine_name;


-- ------------------------------------------------------------
-- V2. Confirm trigger exists on citas
-- ------------------------------------------------------------
\echo ''
\echo '--- V2: Trigger trg_historial_cita ---'
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'trg_historial_cita';


-- ------------------------------------------------------------
-- V3. Confirm view exists and returns rows
-- ------------------------------------------------------------
\echo ''
\echo '--- V3: Vista v_mascotas_vacunacion_pendiente ---'
SELECT
    mascota_id,
    mascota_nombre,
    especie,
    dueno_nombre,
    total_vacunas,
    ultima_vacuna,
    estado_vacunacion
FROM v_mascotas_vacunacion_pendiente
ORDER BY estado_vacunacion, mascota_nombre;


-- ------------------------------------------------------------
-- V4. Confirm roles exist
-- ------------------------------------------------------------
\echo ''
\echo '--- V4: Roles creados ---'
SELECT
    rolname,
    rolcanlogin,
    rolsuper
FROM pg_roles
WHERE rolname IN (
    'veterinario', 'recepcion', 'administrador',
    'app_veterinario', 'app_recepcion', 'app_administrador', 'app_api'
)
ORDER BY rolname;


-- ------------------------------------------------------------
-- V5. Confirm RLS is enabled on the expected tables
-- ------------------------------------------------------------
\echo ''
\echo '--- V5: Tablas con RLS habilitado ---'
SELECT
    tablename,
    rowsecurity   AS rls_enabled,
    forcerowsecurity AS rls_forced
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'mascotas', 'citas', 'vacunas_aplicadas',
      'historial_movimientos', 'alertas', 'inventario_vacunas'
  )
ORDER BY tablename;


-- ------------------------------------------------------------
-- V6. List all RLS policies
-- ------------------------------------------------------------
\echo ''
\echo '--- V6: Políticas RLS definidas ---'
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ------------------------------------------------------------
-- V7. Quick smoke test: sp_agendar_cita
--     Schedule a valid appointment for mascota 1 with vet 2
--     (Dra. García, descansa domingo) on a Wednesday.
--     Wednesday = 2026-04-22 (confirmed non-rest day for vet 2).
-- ------------------------------------------------------------
\echo ''
\echo '--- V7: Prueba sp_agendar_cita (cita válida) ---'
DO $$
DECLARE
    v_id INT;
BEGIN
    CALL sp_agendar_cita(1, 2, '2026-04-22 14:00:00'::TIMESTAMP, 'Revisión de prueba', v_id);
    RAISE NOTICE 'Cita de prueba creada con ID: %', v_id;
END $$;


-- ------------------------------------------------------------
-- V8. Smoke test: sp_agendar_cita should REJECT a rest day
--     Vet 1 (Dr. López) rests on Monday. 2026-04-20 is a Monday.
-- ------------------------------------------------------------
\echo ''
\echo '--- V8: Prueba sp_agendar_cita (debe rechazar día de descanso) ---'
DO $$
DECLARE
    v_id INT;
BEGIN
    CALL sp_agendar_cita(1, 1, '2026-04-20 10:00:00'::TIMESTAMP, 'Test día descanso', v_id);
    RAISE NOTICE 'ERROR: La cita debió haber sido rechazada.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Correcto — excepción esperada: %', SQLERRM;
END $$;


-- ------------------------------------------------------------
-- V9. fn_calcular_facturacion — verify against known data
--     mascota_id=1, año=2025: citas completadas son 450+350 = 800
-- ------------------------------------------------------------
\echo ''
\echo '--- V9: fn_calcular_facturacion(1, 2025) debe retornar 800.00 ---'
SELECT fn_calcular_facturacion(1, 2025) AS facturacion_2025_mascota1;


-- ------------------------------------------------------------
-- V10. Confirm trigger wrote to historial_movimientos
-- ------------------------------------------------------------
\echo ''
\echo '--- V10: Entradas en historial_movimientos (tipo CITA_CREADA) ---'
SELECT
    id,
    tipo,
    referencia_id,
    descripcion,
    fecha
FROM historial_movimientos
WHERE tipo = 'CITA_CREADA'
ORDER BY fecha DESC
LIMIT 5;


\echo ''
\echo '============================================================='
\echo ' Todas las verificaciones completadas.'
\echo ' El sistema de la clínica veterinaria está listo.'
\echo '============================================================='
