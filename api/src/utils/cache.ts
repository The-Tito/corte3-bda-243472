import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  console.log(`[${new Date().toISOString()}] Redis connected`);
});

redis.on('error', (err: Error) => {
  console.error(`[${new Date().toISOString()}] Redis error:`, err.message);
});

export const KEYS = {
  vacunacionPendiente: 'vacunacion:pendiente:all',
} as const;

export const TTL = {
  vacunacion: 300, // seconds
} as const;

/**
 * Attempt to retrieve a cached value.
 * Logs a HIT or MISS with ISO 8601 timestamp.
 */
export async function cacheGet(key: string): Promise<any | null> {
  try {
    const raw = await redis.get(key);
    if (raw !== null) {
      console.log(`[${new Date().toISOString()}] [CACHE HIT] ${key}`);
      return JSON.parse(raw);
    }
    console.log(`[${new Date().toISOString()}] [CACHE MISS] ${key}`);
    return null;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [CACHE ERROR] ${key}`, err);
    return null;
  }
}

/**
 * Store a value in the cache with a TTL (in seconds).
 */
export async function cacheSet(key: string, data: any, ttl: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [CACHE SET ERROR] ${key}`, err);
  }
}

/**
 * Delete a key from the cache and log the invalidation.
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`[${new Date().toISOString()}] [CACHE INVALIDATED] ${key}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [CACHE DELETE ERROR] ${key}`, err);
  }
}

export default redis;
