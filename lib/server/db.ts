import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlInstance: NeonQueryFunction<false, false> | null = null;

/**
 * Returns a singleton server-side Neon PostgreSQL query interface.
 * Fails clearly if DATABASE_URL is missing from the server environment.
 * Never exposes DATABASE_URL to client bundles.
 */
export function getDb(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || !databaseUrl.trim()) {
    throw new Error(
      "Missing database configuration: DATABASE_URL must be set in server environment."
    );
  }

  if (!sqlInstance) {
    sqlInstance = neon(databaseUrl.trim());
  }

  return sqlInstance;
}
