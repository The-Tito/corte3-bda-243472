import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { withRoleContext } from '../db/pool';
import { cacheGet, cacheSet, KEYS, TTL } from '../utils/cache';

const router = Router();

/**
 * GET /api/vacunacion-pendiente
 * Returns all pets with pending vaccinations from the view v_mascotas_vacunacion_pendiente.
 * Results are cached in Redis for TTL.vacunacion seconds (300 s).
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // 1. Check cache first
    const cached = await cacheGet(KEYS.vacunacionPendiente);
    if (cached !== null) {
      res.status(200).json({ mascotas: cached, cache_hit: true });
      return;
    }

    // 2. Cache miss — query the database
    const mascotas = await withRoleContext(req.userRole, req.vetId, async (client) => {
      const result = await client.query(
        `SELECT * FROM v_mascotas_vacunacion_pendiente`
      );
      return result.rows;
    });

    // 3. Store result in cache
    await cacheSet(KEYS.vacunacionPendiente, mascotas, TTL.vacunacion);

    res.status(200).json({ mascotas, cache_hit: false });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] GET /api/vacunacion-pendiente:`, err.message);
    // PostgreSQL error code 42501 = insufficient_privilege
    if (err.code === '42501') {
      res.status(403).json({
        error: 'Acceso denegado',
        detail: 'Tu rol no tiene permisos para consultar vacunación pendiente. Solo veterinario y administrador pueden acceder a esta sección.',
      });
    } else {
      res.status(500).json({ error: 'Error al consultar vacunación pendiente', detail: err.message });
    }
  }
});

export default router;
