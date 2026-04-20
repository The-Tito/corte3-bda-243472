-- =============================================================
-- 04_roles_y_permisos.sql
-- Role definitions and permission grants for the veterinary clinic.
-- Run AFTER schema_corte3.sql.
-- Safe to re-run: uses DO $$ blocks to avoid "already exists" errors.
-- =============================================================

-- =============================================================
-- SECTION 1: Create group roles (NOLOGIN)
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'veterinario') THEN
        CREATE ROLE veterinario NOLOGIN;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'recepcion') THEN
        CREATE ROLE recepcion NOLOGIN;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'administrador') THEN
        CREATE ROLE administrador NOLOGIN;
    END IF;
END $$;


-- =============================================================
-- SECTION 2: REVOKE defaults from PUBLIC
-- PostgreSQL grants CONNECT and USAGE on public schema to PUBLIC
-- by default. We tighten this so only our roles can use them.
-- =============================================================

-- Remove PUBLIC from the schema so roles must be granted explicitly
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Re-grant usage to our three roles (required to resolve object names)
GRANT USAGE ON SCHEMA public TO veterinario;
GRANT USAGE ON SCHEMA public TO recepcion;
GRANT USAGE ON SCHEMA public TO administrador;


-- =============================================================
-- SECTION 3: Role — veterinario
--   Can view and work with clinical data for their own patients.
--   Cannot access audit/alert tables or full inventory details.
-- =============================================================

-- mascotas: full read (RLS filters rows to their own patients at runtime)
GRANT SELECT ON mascotas TO veterinario;

-- duenos: read (needed to show owner info alongside patient)
GRANT SELECT ON duenos TO veterinario;

-- veterinarios: limited read — no salary/sensitive fields (schema has none,
--   but we explicitly list the columns that are relevant for clinical work)
GRANT SELECT (id, nombre, cedula, activo, dias_descanso) ON veterinarios TO veterinario;

-- vet_atiende_mascota: read (used to determine which patients belong to this vet)
GRANT SELECT ON vet_atiende_mascota TO veterinario;

-- citas: read and create (RLS restricts reads to their own appointments)
GRANT SELECT, INSERT ON citas TO veterinario;

-- vacunas_aplicadas: read and record new vaccinations
GRANT SELECT, INSERT ON vacunas_aplicadas TO veterinario;

-- inventario_vacunas: limited read — stock info to check availability; no cost editing
--   Step 1: remove any broad grant first (idempotent REVOKE is safe)
REVOKE ALL ON inventario_vacunas FROM veterinario;
--   Step 2: grant only the columns the vet actually needs
GRANT SELECT (id, nombre, stock_actual) ON inventario_vacunas TO veterinario;

-- Sequences: needed for INSERT operations (SERIAL columns)
GRANT USAGE ON SEQUENCE citas_id_seq              TO veterinario;
GRANT USAGE ON SEQUENCE vacunas_aplicadas_id_seq  TO veterinario;

-- Procedures & Functions
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO veterinario;
GRANT EXECUTE ON FUNCTION  fn_calcular_facturacion(INT, INT)                TO veterinario;

-- Views
GRANT SELECT ON v_mascotas_vacunacion_pendiente TO veterinario;

-- historial_movimientos: NO access (write-only audit trail, managed by triggers)
-- alertas:               NO access (administrative table only)


-- =============================================================
-- SECTION 4: Role — recepcion
--   Handles scheduling, patient registration, and owner lookups.
--   No access to clinical/vaccination data or audit tables.
-- =============================================================

-- mascotas: read (to find which patient to schedule for)
GRANT SELECT ON mascotas TO recepcion;

-- duenos: read (to verify owner contact details)
GRANT SELECT ON duenos TO recepcion;

-- veterinarios: read columns needed for scheduling UI + procedure internal validation
-- sp_agendar_cita (SECURITY INVOKER) reads activo and dias_descanso internally;
-- recepcion must have those columns or the CALL fails with permission denied
GRANT SELECT (id, nombre, activo, dias_descanso) ON veterinarios TO recepcion;

-- citas: read all + create new (scheduling is the core reception task)
GRANT SELECT, INSERT ON citas TO recepcion;

-- Sequences for INSERT
GRANT USAGE ON SEQUENCE citas_id_seq TO recepcion;

-- Procedures the receptionist can call
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO recepcion;

-- vacunas_aplicadas:   NO access
-- inventario_vacunas:  NO access
-- historial_movimientos: NO access
-- alertas:               NO access


-- =============================================================
-- SECTION 5: Role — administrador
--   Full access to every table, sequence, function, and procedure.
-- =============================================================

-- All tables
GRANT ALL ON TABLE
    duenos,
    veterinarios,
    mascotas,
    vet_atiende_mascota,
    citas,
    inventario_vacunas,
    vacunas_aplicadas,
    historial_movimientos,
    alertas
TO administrador;

-- All sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO administrador;

-- All routines
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO administrador;
GRANT EXECUTE ON FUNCTION  fn_calcular_facturacion(INT, INT)                TO administrador;
GRANT EXECUTE ON FUNCTION  fn_registrar_historial_cita()                    TO administrador;

-- Views
GRANT SELECT ON v_mascotas_vacunacion_pendiente TO administrador;


-- =============================================================
-- SECTION 6: Login roles for the application backend
--   Each login role inherits from its corresponding group role.
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_veterinario') THEN
        CREATE ROLE app_veterinario LOGIN PASSWORD 'vet_pass_2026' IN ROLE veterinario;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_recepcion') THEN
        CREATE ROLE app_recepcion LOGIN PASSWORD 'rec_pass_2026' IN ROLE recepcion;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_administrador') THEN
        CREATE ROLE app_administrador LOGIN PASSWORD 'admin_pass_2026' IN ROLE administrador;
    END IF;
END $$;


-- =============================================================
-- SECTION 7: Shared API connection role (app_api)
--   A single connection role used by the HTTP API layer.
--   The API sets the session setting app.current_vet_id and then
--   calls SET LOCAL ROLE to impersonate the correct group role.
--   This role needs only CONNECT; actual data permissions come
--   from SET ROLE at query time.
--
--   Pattern in the API (pseudocode):
--     BEGIN;
--     SET LOCAL ROLE veterinario;
--     SET LOCAL app.current_vet_id = '3';
--     SELECT * FROM mascotas;   -- RLS filters automatically
--     COMMIT;
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_api') THEN
        CREATE ROLE app_api LOGIN PASSWORD 'api_pass_2026';
    END IF;
END $$;

-- app_api must be able to SET ROLE to each group role
GRANT veterinario   TO app_api;
GRANT recepcion     TO app_api;
GRANT administrador TO app_api;

-- Grant schema usage so app_api can resolve names before SET ROLE
GRANT USAGE ON SCHEMA public TO app_api;
