import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { withRoleContext } from '../db/pool';

const router = Router();

/**
 * GET /api/mascotas
 * Optional query param: nombre (string, searched with ILIKE)
 *
 * SECURITY: The nombre value is ALWAYS passed as a query parameter ($1).
 * String concatenation into SQL is strictly forbidden.
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { nombre } = req.query;

  try {
    const mascotas = await withRoleContext(req.userRole, req.vetId, async (client) => {
      if (nombre && typeof nombre === 'string' && nombre.trim() !== '') {
        // Parametrized ILIKE — the search term is NEVER concatenated into the query string
        const result = await client.query(
          `SELECT id, nombre, especie, dueno_id
           FROM mascotas
           WHERE nombre ILIKE $1
           ORDER BY nombre`,
          [`%${nombre.trim()}%`]
        );
        return result.rows;
      } else {
        const result = await client.query(
          `SELECT id, nombre, especie, dueno_id
           FROM mascotas
           ORDER BY nombre`
        );
        return result.rows;
      }
    });

    res.status(200).json({ mascotas });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] GET /api/mascotas:`, err.message);
    if (err.code === '42501') {
      res.status(403).json({
        error: 'Acceso denegado',
        detail: 'Tu rol no tiene permisos para consultar mascotas.',
      });
    } else {
      res.status(500).json({ error: 'Error al consultar mascotas', detail: err.message });
    }
  }
});

export default router;
