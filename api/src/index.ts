import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import mascotasRouter from './routes/mascotas';
import vacunacionRouter from './routes/vacunacion';
import citasRouter from './routes/citas';
import vacunasAplicadasRouter from './routes/vacunasAplicadas';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api', authRouter);
app.use('/api/mascotas', mascotasRouter);
app.use('/api/vacunacion-pendiente', vacunacionRouter);
app.use('/api/citas', citasRouter);
app.use('/api/vacunas-aplicadas', vacunasAplicadasRouter);

// Health-check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] [UNHANDLED ERROR] ${err.message}`, err.stack);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Clinica Vet API running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] CORS enabled for http://localhost:3000`);
});

export default app;
