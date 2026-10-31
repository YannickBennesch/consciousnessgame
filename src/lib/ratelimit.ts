import { db } from "./db";

/**
 * Sliding-window limiter stored in Postgres, so it holds across server instances.
 * Returns true if the action is allowed (and records the hit).
 */
export async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const count = await db.rateLimitHit.count({ where: { key, at: { gte: since } } });
  if (count >= limit) return false;
  await db.rateLimitHit.create({ data: { key } });
  // Opportunistic cleanup of old rows.
  if (Math.random() < 0.02) {
    await db.rateLimitHit.deleteMany({ where: { at: { lt: new Date(Date.now() - 24 * 3600_000) } } });
  }
  return true;
}
