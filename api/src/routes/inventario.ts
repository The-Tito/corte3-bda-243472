import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { withRoleContext } from '../db/pool';

const router = Router();

/**
 * GET /api/inventario
 * Returns the vaccine inventory.
 * Note: RLS and Column-level grants in SQL will restrict what each role sees.
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const items = await withRoleContext(req.userRole, req.vetId, async (client) => {
      // Column-level GRANTs defined in 04_roles_y_permisos.sql:
      // - veterinario: SELECT (id, nombre, stock_actual) only
      // - administrador: ALL columns
      // - recepcion: NO access (will 403 before this point via RLS)
      // We must use role-specific column lists; SELECT * fails for veterinario.
      let query: string;
      if (req.userRole === 'administrador') {
        query = `SELECT id, nombre, stock_actual, stock_minimo, costo_unitario FROM inventario_vacunas ORDER BY nombre`;
      } else {
        // veterinario: only the columns granted
        query = `SELECT id, nombre, stock_actual FROM inventario_vacunas ORDER BY nombre`;
      }
      const result = await client.query(query);
      return result.rows;
    });

    res.status(200).json({ items });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [ERROR] GET /api/inventario:`, err.message);
    if (err.code === '42501') {
      res.status(403).json({
        error: 'Acceso denegado',
        detail: 'Tu rol no tiene permisos para consultar el inventario.',
      });
    } else {
      res.status(500).json({ error: 'Error al consultar inventario', detail: err.message });
    }
  }
});

export default router;
