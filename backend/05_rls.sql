-- =============================================================
-- 05_rls.sql
-- Row-Level Security policies for the veterinary clinic system.
-- Run AFTER 04_roles_y_permisos.sql.
--
-- Context mechanism:
--   The API backend sets two session-local parameters before queries:
--     SET LOCAL app.current_vet_id  = '<vet id as text>';
--     SET LOCAL app.current_role    = 'veterinario';   -- or 'recepcion', 'administrador'
--
--   RLS policies read these with:
--     current_setting('app.current_vet_id', true)   -- 'true' = return '' if not set (no error)
--     current_user                                  -- the PostgreSQL role name after SET ROLE
--
-- Drop-and-recreate pattern is used throughout so this file is
-- safe to re-run after changes.
-- =============================================================


-- =============================================================
-- TABLE: mascotas
-- =============================================================

ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner (superuser bypasses RLS by default,
-- but app roles are not superusers so this is a defence-in-depth measure).
ALTER TABLE mascotas FORCE ROW LEVEL SECURITY;

-- Policy for veterinario:
--   Can only see mascotas assigned to them via vet_atiende_mascota
--   AND where the assignment is active.
DROP POLICY IF EXISTS pol_mascotas_veterinario ON mascotas;
CREATE POLICY pol_mascotas_veterinario
    ON mascotas
    FOR ALL
    TO veterinario
    USING (
        EXISTS (
            SELECT 1
            FROM vet_atiende_mascota vam
            WHERE vam.mascota_id = mascotas.id
              AND vam.vet_id     = current_setting('app.current_vet_id', true)::INT
              AND vam.activa     = true
        )
    );

-- Policy for recepcion: sees all mascotas (scheduling needs the full list)
DROP POLICY IF EXISTS pol_mascotas_recepcion ON mascotas;
CREATE POLICY pol_mascotas_recepcion
    ON mascotas
    FOR ALL
    TO recepcion
    USING (true);

-- Policy for administrador: sees and modifies all rows
DROP POLICY IF EXISTS pol_mascotas_administrador ON mascotas;
CREATE POLICY pol_mascotas_administrador
    ON mascotas
    FOR ALL
    TO administrador
    USING (true)
    WITH CHECK (true);


-- =============================================================
-- TABLE: vacunas_aplicadas
-- =============================================================

ALTER TABLE vacunas_aplicadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacunas_aplicadas FORCE ROW LEVEL SECURITY;

-- Policy for veterinario:
--   Can only see / insert vaccinations for their own patients.
--   The WITH CHECK clause prevents inserting a vaccination for a
--   mascota not assigned to this vet.
DROP POLICY IF EXISTS pol_vacunas_veterinario ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_veterinario
    ON vacunas_aplicadas
    FOR ALL
    TO veterinario
    USING (
        EXISTS (
            SELECT 1
            FROM vet_atiende_mascota vam
            WHERE vam.mascota_id = vacunas_aplicadas.mascota_id
              AND vam.vet_id     = current_setting('app.current_vet_id', true)::INT
              AND vam.activa     = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM vet_atiende_mascota vam
            WHERE vam.mascota_id = vacunas_aplicadas.mascota_id
              AND vam.vet_id     = current_setting('app.current_vet_id', true)::INT
              AND vam.activa     = true
        )
    );

-- Policy for administrador: full access
DROP POLICY IF EXISTS pol_vacunas_administrador ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_administrador
    ON vacunas_aplicadas
    FOR ALL
    TO administrador
    USING (true)
    WITH CHECK (true);

-- recepcion: REVOKE in 04_roles already removes access;
-- adding an explicit deny-all RLS policy adds a second layer.
DROP POLICY IF EXISTS pol_vacunas_recepcion ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_recepcion
    ON vacunas_aplicadas
    FOR ALL
    TO recepcion
    USING (false);   -- deny all rows — belt-and-suspenders with REVOKE


-- =============================================================
-- TABLE: citas
-- =============================================================

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas FORCE ROW LEVEL SECURITY;

-- Policy for veterinario:
--   Reads only their own appointments.
--   Can insert an appointment only where veterinario_id matches
--   their own ID (prevents booking under another vet's name).
DROP POLICY IF EXISTS pol_citas_veterinario_select ON citas;
CREATE POLICY pol_citas_veterinario_select
    ON citas
    FOR SELECT
    TO veterinario
    USING (
        veterinario_id = current_setting('app.current_vet_id', true)::INT
    );

DROP POLICY IF EXISTS pol_citas_veterinario_insert ON citas;
CREATE POLICY pol_citas_veterinario_insert
    ON citas
    FOR INSERT
    TO veterinario
    WITH CHECK (
        veterinario_id = current_setting('app.current_vet_id', true)::INT
    );

-- Policy for recepcion:
--   Reads all citas (to manage the schedule).
--   Can insert citas for any vet (they book on behalf of clients).
DROP POLICY IF EXISTS pol_citas_recepcion ON citas;
CREATE POLICY pol_citas_recepcion
    ON citas
    FOR ALL
    TO recepcion
    USING (true)
    WITH CHECK (true);

-- Policy for administrador: full access
DROP POLICY IF EXISTS pol_citas_administrador ON citas;
CREATE POLICY pol_citas_administrador
    ON citas
    FOR ALL
    TO administrador
    USING (true)
    WITH CHECK (true);


-- =============================================================
-- TABLE: historial_movimientos
-- RLS is enabled to prevent direct reads/writes from low-privilege
-- roles. The audit trigger function uses SECURITY DEFINER so it
-- can always write regardless of caller role.
-- =============================================================

ALTER TABLE historial_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_movimientos FORCE ROW LEVEL SECURITY;

-- Only administrador can read the audit log directly
DROP POLICY IF EXISTS pol_historial_administrador ON historial_movimientos;
CREATE POLICY pol_historial_administrador
    ON historial_movimientos
    FOR ALL
    TO administrador
    USING (true)
    WITH CHECK (true);

-- veterinario and recepcion: deny all (no explicit policy = no access under RLS)


-- =============================================================
-- TABLE: alertas
-- =============================================================

ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas FORCE ROW LEVEL SECURITY;

-- Only administrador accesses alerts
DROP POLICY IF EXISTS pol_alertas_administrador ON alertas;
CREATE POLICY pol_alertas_administrador
    ON alertas
    FOR ALL
    TO administrador
    USING (true)
    WITH CHECK (true);


-- =============================================================
-- TABLE: inventario_vacunas
-- RLS is light here because column-level grants already restrict
-- what veterinario can see; recepcion has no grant at all.
-- =============================================================

ALTER TABLE inventario_vacunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_vacunas FORCE ROW LEVEL SECURITY;

-- veterinario: can see all inventory rows (column grant limits columns)
DROP POLICY IF EXISTS pol_inventario_veterinario ON inventario_vacunas;
CREATE POLICY pol_inventario_veterinario
    ON inventario_vacunas
    FOR SELECT
    TO veterinario
    USING (true);

-- administrador: full access
DROP POLICY IF EXISTS pol_inventario_administrador ON inventario_vacunas;
CREATE POLICY pol_inventario_administrador
    ON inventario_vacunas
    FOR ALL
    TO administrador
    USING (true)
    WITH CHECK (true);
