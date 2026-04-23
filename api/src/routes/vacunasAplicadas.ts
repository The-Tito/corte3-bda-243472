import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { withRoleContext } from '../db/pool';
import { cacheDelete, KEYS } from '../utils/cache';

const router = Router();

const vacunaAplicadaSchema = z.object({
  mascota_id: z.number({ required_error: 'mascota_id is required' }).int().positive(),
  vacuna_id: z.number({ required_error: 'vacuna_id is required' }).int().positive(),
  veterinario_id: z.number({ required_error: 'veterinario_id is required' }).int().positive(),
  costo_cobrado: z
    .number({ required_error: 'costo_cobrado is required' })
    .nonnegative('costo_cobrado must be >= 0'),
});

/**
 * POST /api/vacunas-aplicadas
 * Body: { mascota_id, vacuna_id, veterinario_id, costo_cobrado }
 * Requires veterinario role.
 * Inserts a new record into vacunas_aplicadas and invalidates the pending
 * vaccination cache so future reads reflect the updated state.
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  // Role guard — only veterinarios may record applied vaccines
  if (req.userRole !== 'veterinario') {
    res.status(403).json({ error: 'Solo los veterinarios pueden registrar vacunas aplicadas' });
    return;
  }

  const parse = vacunaAplicadaSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
    return;
  }

  const { mascota_id, vacuna_id, veterinario_id, costo_cobrado } = parse.data;

  try {
    const newRecord = await withRoleContext(req.userRole, req.vetId, async (client) => {
      const result = await client.query(
        `INSERT INTO vacunas_aplicadas (mascota_id, vacuna_id, veterinario_id, fecha_aplicacion, costo_cobrado)
         VALUES ($1, $2, $3, NOW(), $4)
         RETURNING id`,
        [mascota_id, vacuna_id, veterinario_id, costo_cobrado]
      );
      return result.rows[0];
    });

    // Invalidate the vacunacion pendiente cache so stale data is not served
    await cacheDelete(`${KEYS.vacunacionPendiente}:veterinario`);
    await cacheDelete(`${KEYS.vacunacionPendiente}:administrador`);

    res.status(201).json({
      id: newRecord?.id ?? null,
      message: 'Vacuna aplicada y caché actualizado',
    });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] POST /api/vacunas-aplicadas:`, err.message);
    res.status(500).json({ error: 'Error al registrar vacuna aplicada', detail: err.message });
  }
});

export default router;
