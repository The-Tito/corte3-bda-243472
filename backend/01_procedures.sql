-- =============================================================
-- 01_procedures.sql
-- Stored procedures and functions for the veterinary clinic system.
-- Run AFTER schema_corte3.sql.
-- =============================================================

-- =============================================================
-- 1. sp_agendar_cita
--    Schedules an appointment after validating:
--      a) veterinario exists and is active
--      b) veterinario is not resting on the requested day of the week
--      c) mascota exists
--    Returns the new cita id via OUT parameter.
--    SECURITY INVOKER: runs with the privileges of the calling user.
--    No dynamic SQL used.
-- =============================================================

CREATE OR REPLACE PROCEDURE sp_agendar_cita(
    p_mascota_id      INT,
    p_veterinario_id  INT,
    p_fecha_hora      TIMESTAMP,
    p_motivo          TEXT,
    OUT p_cita_id     INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_vet_activo        BOOLEAN;
    v_vet_nombre        VARCHAR(100);
    v_dias_descanso     VARCHAR(50);
    v_dia_semana        TEXT;       -- Spanish day name, lowercase
    v_mascota_existe    BOOLEAN;
BEGIN
    -- --------------------------------------------------------
    -- 1. Validate veterinario exists and is active
    -- --------------------------------------------------------
    SELECT activo, nombre, COALESCE(dias_descanso, '')
      INTO v_vet_activo, v_vet_nombre, v_dias_descanso
      FROM veterinarios
     WHERE id = p_veterinario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Veterinario con ID % no existe.', p_veterinario_id;
    END IF;

    IF NOT v_vet_activo THEN
        RAISE EXCEPTION 'El veterinario % (ID %) está inactivo y no puede recibir citas.',
                        v_vet_nombre, p_veterinario_id;
    END IF;

    -- --------------------------------------------------------
    -- 2. Validate the vet is not on a rest day
    --    EXTRACT(DOW) returns: 0=Sunday, 1=Monday, ..., 6=Saturday
    --    We map that to Spanish day names matching dias_descanso format.
    -- --------------------------------------------------------
    v_dia_semana := CASE EXTRACT(DOW FROM p_fecha_hora)
                        WHEN 0 THEN 'domingo'
                        WHEN 1 THEN 'lunes'
                        WHEN 2 THEN 'martes'
                        WHEN 3 THEN 'miercoles'
                        WHEN 4 THEN 'jueves'
                        WHEN 5 THEN 'viernes'
                        WHEN 6 THEN 'sabado'
                    END;

    -- dias_descanso is a comma-separated list, e.g. 'lunes,jueves' or 'domingo' or ''
    -- We check if the day name appears as a standalone token in the list.
    -- Using string_to_array avoids substring false-positives (e.g. 'lunes' vs 'martelunes').
    IF v_dias_descanso <> '' AND
       v_dia_semana = ANY(string_to_array(v_dias_descanso, ','))
    THEN
        RAISE EXCEPTION 'El veterinario % (ID %) descansa los %. No se puede agendar cita para el %.',
                        v_vet_nombre, p_veterinario_id,
                        v_dias_descanso,
                        to_char(p_fecha_hora, 'DD/MM/YYYY HH24:MI');
    END IF;

    -- --------------------------------------------------------
    -- 3. Validate mascota exists
    -- --------------------------------------------------------
    SELECT EXISTS(SELECT 1 FROM mascotas WHERE id = p_mascota_id)
      INTO v_mascota_existe;

    IF NOT v_mascota_existe THEN
        RAISE EXCEPTION 'Mascota con ID % no existe.', p_mascota_id;
    END IF;

    -- --------------------------------------------------------
    -- 4. Insert the new appointment
    -- --------------------------------------------------------
    INSERT INTO citas (mascota_id, veterinario_id, fecha_hora, motivo, estado)
    VALUES (p_mascota_id, p_veterinario_id, p_fecha_hora, p_motivo, 'AGENDADA')
    RETURNING id INTO p_cita_id;

    RAISE NOTICE 'Cita agendada correctamente. ID de cita: %', p_cita_id;
END;
$$;

COMMENT ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) IS
    'Agenda una cita validando que el veterinario exista, esté activo y no esté en día de descanso, '
    'y que la mascota exista. Devuelve el id de la cita creada en el parámetro OUT p_cita_id.';


-- =============================================================
-- 2. fn_calcular_facturacion
--    Returns the total cost of COMPLETED appointments for a given
--    mascota within a given calendar year.
--    Returns 0.00 (not NULL) when there are no matching records.
--    SECURITY INVOKER: no privilege escalation.
-- =============================================================

CREATE OR REPLACE FUNCTION fn_total_facturado(
    p_mascota_id  INT,
    p_anio         INT
)
RETURNS NUMERIC
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT COALESCE(SUM(costo), 0.00)
      FROM citas
     WHERE mascota_id = p_mascota_id
       AND EXTRACT(YEAR FROM fecha_hora) = p_anio
       AND estado = 'COMPLETADA';
$$;

COMMENT ON FUNCTION fn_total_facturado(INT, INT) IS
    'Devuelve el total facturado (suma de costo) de las citas COMPLETADAS '
    'de una mascota en un año dado. Retorna 0.00 si no hay citas.';
