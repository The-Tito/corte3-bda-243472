import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { withRoleContext } from '../db/pool';

const router = Router();

const citaSchema = z.object({
  mascota_id: z.number({ required_error: 'mascota_id is required' }).int().positive(),
  veterinario_id: z.number({ required_error: 'veterinario_id is required' }).int().positive(),
  fecha_hora: z.string({ required_error: 'fecha_hora is required' }).min(1, 'fecha_hora cannot be empty'),
  motivo: z.string({ required_error: 'motivo is required' }).min(1, 'motivo cannot be empty'),
});

/**
 * POST /api/citas
 * Body: { mascota_id, veterinario_id, fecha_hora, motivo }
 * Calls the stored procedure sp_agendar_cita to schedule an appointment.
 * Returns 201 on success, 400 if the DB raises an exception.
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const parse = citaSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
    return;
  }

  const { mascota_id, veterinario_id, fecha_hora, motivo } = parse.data;

  try {
    const result = await withRoleContext(req.userRole, req.vetId, async (client) => {
      // sp_agendar_cita is a PROCEDURE with an OUT param — must use CALL
      const queryResult = await client.query(
        `CALL sp_agendar_cita($1, $2, $3::timestamp, $4, NULL)`,
        [mascota_id, veterinario_id, fecha_hora, motivo]
      );
      return queryResult.rows[0]; // contains { p_cita_id: <id> }
    });

    res.status(201).json({
      cita_id: result?.p_cita_id ?? null,
      message: 'Cita agendada exitosamente',
    });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] POST /api/citas:`, err.message);
    // Surface DB-level errors (e.g., scheduling conflicts) as 400 Bad Request
    res.status(400).json({ error: 'No se pudo agendar la cita', detail: err.message });
  }
});

/**
 * GET /api/citas
 * Fetches the appointments. RLS handles filtering automatically.
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await withRoleContext(req.userRole, req.vetId, async (client) => {
      const queryResult = await client.query(
        `SELECT c.id, m.nombre as mascota_nombre, v.nombre as veterinario_nombre, c.fecha_hora, c.motivo, c.estado
         FROM citas c
         JOIN mascotas m ON c.mascota_id = m.id
         JOIN veterinarios v ON c.veterinario_id = v.id
         ORDER BY c.fecha_hora DESC`
      );
      return queryResult.rows;
    });

    res.status(200).json({ citas: result });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] GET /api/citas:`, err.message);
    res.status(500).json({ error: 'No se pudieron consultar las citas', detail: err.message });
  }
});

export default router;
