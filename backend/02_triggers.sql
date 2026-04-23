-- =============================================================
-- 02_triggers.sql
-- Triggers for the veterinary clinic system.
-- Run AFTER schema_corte3.sql.
-- =============================================================

-- =============================================================
-- Trigger function: fn_registrar_historial_cita
--   Fires AFTER INSERT on citas.
--   Inserts one row into historial_movimientos recording that a
--   new appointment was created, including which mascota and which
--   veterinario are involved.
--   SECURITY DEFINER is intentionally avoided here; the trigger
--   runs under the invoker's privileges (the role performing the
--   INSERT on citas must also have INSERT on historial_movimientos,
--   which is granted to the administrador role — see 04_roles.sql).
--   For a cleaner permission model the function is SECURITY DEFINER
--   *only* here because historial_movimientos is a write-only audit
--   table and no role should be able to forge records in it directly.
--   Using SECURITY DEFINER on the trigger function (not the procedure)
--   is the standard PostgreSQL pattern for audit tables.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_registrar_historial_cita()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER   -- Audit functions need DEFINER so low-privilege roles can write the audit trail
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO historial_movimientos (tipo, referencia_id, descripcion, fecha)
    VALUES (
        'CITA_CREADA',
        NEW.id,
        'Cita agendada para mascota ID ' || NEW.mascota_id
            || ' con veterinario ID ' || NEW.veterinario_id,
        NOW()
    );
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_registrar_historial_cita() IS
    'Trigger function que registra automáticamente en historial_movimientos '
    'cada vez que se inserta una nueva cita. Usa SECURITY DEFINER para que '
    'roles de bajo privilegio puedan escribir en la tabla de auditoría sin '
    'tener acceso directo a historial_movimientos.';


-- =============================================================
-- Drop the trigger if it already exists so this file is
-- idempotent (safe to re-run).
-- =============================================================

DROP TRIGGER IF EXISTS trg_historial_cita ON citas;

CREATE TRIGGER trg_historial_cita
    AFTER INSERT ON citas
    FOR EACH ROW
    EXECUTE FUNCTION fn_registrar_historial_cita();

COMMENT ON TRIGGER trg_historial_cita ON citas IS
    'Registra en historial_movimientos cada nueva cita insertada.';
