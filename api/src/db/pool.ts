import { Pool, PoolClient } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'clinica_vet',
  user: process.env.DB_USER || 'app_api',
  password: process.env.DB_PASSWORD || '',
});

/**
 * Wraps a database operation in a transaction with the appropriate PostgreSQL
 * role set via SET LOCAL, so Row-Level Security policies apply correctly.
 *
 * Flow:
 *  1. Acquire client from pool
 *  2. BEGIN transaction
 *  3. SET LOCAL ROLE to the user's application role
 *  4. If role is 'veterinario', SET LOCAL app.current_vet_id
 *  5. Execute the provided function
 *  6. COMMIT
 *  7. Release client
 *  On any error: ROLLBACK, release client, rethrow
 */
export async function withRoleContext<T>(
  role: string,
  vetId: number | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // SET LOCAL ROLE only accepts an identifier, not a parameter — safe because
    // role is validated by auth middleware against an allow-list.
    const safeRole = validateRole(role);
    await client.query(`SET LOCAL ROLE ${safeRole}`);

    if (role === 'veterinario' && vetId !== null) {
      // SET LOCAL does not accept parameterized values; vetId is validated as integer by auth middleware
      await client.query(`SET LOCAL "app.current_vet_id" = '${vetId}'`);
    }

    const result = await fn(client);

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Validates the role string against a known allow-list to prevent any
 * injection through the SET LOCAL ROLE statement.
 */
function validateRole(role: string): string {
  const allowed = ['veterinario', 'recepcion', 'administrador'];
  if (!allowed.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return role;
}
