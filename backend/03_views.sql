-- =============================================================
-- 03_views.sql
-- Views for the veterinary clinic system.
-- Run AFTER schema_corte3.sql.
-- =============================================================

-- =============================================================
-- View: v_mascotas_vacunacion_pendiente
--
-- Shows all mascotas that require vaccination attention:
--   - Mascotas that have NEVER been vaccinated (ultima_vacuna IS NULL)
--   - Mascotas whose last vaccination was more than 1 year ago
--
-- Columns:
--   mascota_id         INT     PK of mascotas
--   mascota_nombre     TEXT    Pet name
--   especie            TEXT    Species
--   dueno_nombre       TEXT    Owner full name
--   dueno_telefono     TEXT    Owner phone number
--   total_vacunas      BIGINT  Total number of vaccinations on record (0 if none)
--   ultima_vacuna      DATE    Date of the most recent vaccination (NULL if never)
--   estado_vacunacion  TEXT    'SIN VACUNAS' | 'VENCIDA'
--
-- Notes:
--   The LEFT JOIN + GROUP BY aggregation is done in a sub-select so that
--   the outer WHERE can filter using the computed ultima_vacuna column
--   without repeating the aggregation expression.
-- =============================================================

CREATE OR REPLACE VIEW v_mascotas_vacunacion_pendiente AS
SELECT
    m.id                                        AS mascota_id,
    m.nombre                                    AS mascota_nombre,
    m.especie,
    d.nombre                                    AS dueno_nombre,
    d.telefono                                  AS dueno_telefono,
    COALESCE(vac_agg.total_vacunas, 0)          AS total_vacunas,
    vac_agg.ultima_vacuna,
    CASE
        WHEN vac_agg.ultima_vacuna IS NULL THEN 'SIN VACUNAS'
        ELSE 'VENCIDA'
    END                                         AS estado_vacunacion
FROM mascotas m
JOIN duenos d ON d.id = m.dueno_id
LEFT JOIN (
    -- Aggregate all vaccination records per mascota
    SELECT
        mascota_id,
        COUNT(*)::INT           AS total_vacunas,
        MAX(fecha_aplicacion)   AS ultima_vacuna
    FROM vacunas_aplicadas
    GROUP BY mascota_id
) vac_agg ON vac_agg.mascota_id = m.id
-- Only include mascotas that need attention:
--   never vaccinated  OR  last vaccination was more than 1 year ago
WHERE vac_agg.ultima_vacuna IS NULL
   OR vac_agg.ultima_vacuna < (CURRENT_DATE - INTERVAL '1 year');

COMMENT ON VIEW v_mascotas_vacunacion_pendiente IS
    'Mascotas que nunca han sido vacunadas o cuya última vacuna fue hace más de un año. '
    'estado_vacunacion indica SIN VACUNAS (nunca vacunada) o VENCIDA (vacuna caducada).';
