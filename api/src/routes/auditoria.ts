import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { withRoleContext } from '../db/pool';

const router = Router();

/**
 * GET /api/auditoria
 * Returns the last 100 movements from historial_movimientos.
 * Restricted by DB permissions (usually only administrador).
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await withRoleContext(req.userRole, req.vetId, async (client) => {
      const result = await client.query(
        `SELECT id, tipo, referencia_id, descripcion, fecha
         FROM historial_movimientos
         ORDER BY fecha DESC
         LIMIT 100`
      );
      return result.rows;
    });

    res.status(200).json({ logs });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] GET /api/auditoria:`, err.message);
    if (err.code === '42501') {
      res.status(403).json({
        error: 'Acceso denegado',
        detail: 'Tu rol no tiene permisos para consultar el historial de auditoría.',
      });
    } else {
      res.status(500).json({ error: 'Error al consultar auditoría', detail: err.message });
    }
  }
});

export default router;
