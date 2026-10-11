import crypto from "crypto";

async function getDatabase() {
  const { getDb } = await import("./db");
  return getDb();
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MINUTES = 15;
export const LOCKOUT_WINDOW_MS = LOCKOUT_WINDOW_MINUTES * 60 * 1000;

export const GENERIC_RATE_LIMIT_ERROR =
  "تم تجاوز الحد الأقصى للمحاولات غير الصحيحة. يرجى الانتظار 15 دقيقة قبل المحاولة مرة أخرى.";

/**
 * Extracts client IP address with priority given to trusted infrastructure headers.
 * Handles IPv4, IPv6, and localhost fallbacks.
 */
export function getClientIp(request: Request): string {
  // 1. Vercel trusted edge header
  const vercelIp = request.headers.get("x-vercel-ip");
  if (vercelIp && vercelIp.trim().length > 0) {
    return vercelIp.trim();
  }

  // 2. Real-IP header from reverse proxy
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  // 3. First entry of X-Forwarded-For
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    const first = forwardedFor.split(",")[0].trim();
    if (first.length > 0) {
      return first;
    }
  }

  // 4. Fallback (local development / testing)
  return "127.0.0.1";
}

/**
 * Creates a privacy-preserving one-way keyed hash of the client IP.
 * Raw IP addresses are NEVER persisted in the database.
 */
export function hashClientIdentity(ip: string): string {
  const normalized = ip.trim().toLowerCase();
  return crypto
    .createHash("sha256")
    .update(`researcher_rate_limit_salt_v1:${normalized}`)
    .digest("hex");
}

export interface RateLimitCheckResult {
  allowed: boolean;
  failedCount: number;
  retryAfterSeconds: number;
}

/**
 * Checks whether the client identity has exceeded the failed login attempts threshold
 * in the rolling 15-minute window.
 *
 * Fail-Safe Invariant: If database is unreachable, logs error and fails safely (allowed=true),
 * ensuring password verification is NEVER bypassed while preserving availability.
 */
export async function checkResearcherRateLimit(
  clientHash: string
): Promise<RateLimitCheckResult> {
  try {
    const sql = await getDatabase();
    const rows = (await sql`
      SELECT count(*)::int AS attempt_count,
             min(attempted_at) AS oldest_attempt
      FROM researcher_login_attempts
      WHERE client_hash = ${clientHash}
        AND attempted_at > now() - interval '15 minutes';
    `) as Array<{ attempt_count: number; oldest_attempt: string | null }>;

    const attemptCount = rows[0]?.attempt_count ?? 0;
    const oldestAttempt = rows[0]?.oldest_attempt;

    if (attemptCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
      let retryAfter = LOCKOUT_WINDOW_MINUTES * 60; // 900 seconds fallback
      if (oldestAttempt) {
        const oldestMs = Date.parse(oldestAttempt);
        if (Number.isFinite(oldestMs)) {
          const remainingMs = oldestMs + LOCKOUT_WINDOW_MS - Date.now();
          retryAfter = Math.max(1, Math.ceil(remainingMs / 1000));
        }
      }

      return {
        allowed: false,
        failedCount: attemptCount,
        retryAfterSeconds: retryAfter,
      };
    }

    return {
      allowed: true,
      failedCount: attemptCount,
      retryAfterSeconds: 0,
    };
  } catch (err) {
    // Fail safely: database error does not block legitimate authentication,
    // and strict password verification will still be applied.
    console.error("checkResearcherRateLimit error (failing safely):", err);
    return {
      allowed: true,
      failedCount: 0,
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Records a single failed login attempt for the client hash.
 * Also prunes expired records older than 1 hour to prevent unbounded growth.
 */
export async function recordResearcherFailedAttempt(clientHash: string): Promise<void> {
  try {
    const sql = await getDatabase();
    await sql`
      INSERT INTO researcher_login_attempts (client_hash, attempted_at)
      VALUES (${clientHash}, now());
    `;

    // Prune records older than 1 hour opportunistically
    sql`
      DELETE FROM researcher_login_attempts
      WHERE attempted_at < now() - interval '1 hour';
    `.catch(() => {});
  } catch (err) {
    console.error("recordResearcherFailedAttempt error (failing safely):", err);
  }
}

/**
 * Clears failed login attempts for a client hash upon successful authentication.
 */
export async function clearResearcherRateLimit(clientHash: string): Promise<void> {
  try {
    const sql = await getDatabase();
    await sql`
      DELETE FROM researcher_login_attempts
      WHERE client_hash = ${clientHash};
    `;
  } catch (err) {
    console.error("clearResearcherRateLimit error (failing safely):", err);
  }
}
