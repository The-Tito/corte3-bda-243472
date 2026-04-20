import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const loginSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('veterinario'),
    vet_id: z.number({ required_error: 'vet_id is required for veterinario role' }).int().positive(),
  }),
  z.object({
    role: z.literal('recepcion'),
    vet_id: z.number().int().positive().optional(),
  }),
  z.object({
    role: z.literal('administrador'),
    vet_id: z.number().int().positive().optional(),
  }),
]);

/**
 * POST /api/login
 * Body: { role: 'veterinario'|'recepcion'|'administrador', vet_id?: number }
 * Returns a base64 token: base64(role:vetId)
 */
router.post('/login', (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.flatten() });
    return;
  }

  const { role } = parse.data;
  const vet_id = 'vet_id' in parse.data ? parse.data.vet_id : undefined;

  // Build the raw string before encoding
  const rawString = role === 'veterinario' ? `${role}:${vet_id}` : `${role}:`;

  const token = Buffer.from(rawString, 'utf8').toString('base64');

  res.status(200).json({
    token,
    role,
    vet_id: vet_id ?? null,
  });
});

export default router;
