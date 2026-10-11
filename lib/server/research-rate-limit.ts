import crypto from "crypto";
import net from "net";

async function getDatabase() {
  const { getDb } = await import("./db");
  return getDb();
}

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MINUTES = 15;
export const LOCKOUT_WINDOW_MS = LOCKOUT_WINDOW_MINUTES * 60 * 1000;

export const GENERIC_RATE_LIMIT_ERROR =
  "تم تجاوز الحد الأقصى للمحاولات غير الصحيحة. يرجى الانتظار 15 دقيقة قبل المحاولة مرة أخرى.";

export const SERVICE_UNAVAILABLE_RATE_LIMIT_ERROR =
  "خدمة تسجيل الدخول غير متاحة مؤقتاً لتعذر التحقق من نظام الأمان. يرجى المحاولة لاحقاً.";

export const UNRESOLVED_CLIENT_IDENTITY = "UNRESOLVED_CLIENT_IDENTITY";

/**
 * Normalizes an IP string: strips surrounding brackets and port numbers if present,
 * and validates that the result is a syntactically valid IPv4 or IPv6 address.
 * Returns normalized IP, or null if malformed.
 */
export function normalizeIpAddress(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let candidate = raw.trim();
  if (!candidate) return null;

  // Bracketed IPv6 with optional port: e.g. "[2001:db8::1]:8080" or "[::1]"
  const bracketMatch = candidate.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/);
  if (bracketMatch) {
    candidate = bracketMatch[1];
  } else {
    // IPv4 with optional port: e.g. "192.168.1.1:8080"
    const ipv4PortMatch = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    if (ipv4PortMatch) {
      candidate = ipv4PortMatch[1];
    }
  }

  const kind = net.isIP(candidate);
  if (kind === 4) {
    const parts = candidate.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
      return candidate;
    }
    return null;
  }
  if (kind === 6) {
    return candidate.toLowerCase();
  }
  return null;
}

/**
 * Extracts and validates client IP address with documented Vercel reverse proxy precedence.
 * Precedence:
 *   1. x-real-ip (Vercel edge authoritative remote client IP)
 *   2. x-vercel-forwarded-for (first entry in Vercel edge chain)
 *   3. x-forwarded-for (first entry in standard proxy chain)
 *
 * Fallback:
 *   If no valid IP can be extracted (missing, empty, or malformed), returns
 *   UNRESOLVED_CLIENT_IDENTITY so unidentifiable callers share a strict rate-limit bucket
 *   rather than evading throttling.
 */
export function getClientIp(request: Request): string {
  // 1. Vercel edge authoritative client IP
  const realIp = request.headers.get("x-real-ip");
  const normalizedRealIp = normalizeIpAddress(realIp);
  if (normalizedRealIp) {
    return normalizedRealIp;
  }

  // 2. Vercel-specific forwarded chain
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0];
    const normalized = normalizeIpAddress(first);
    if (normalized) {
      return normalized;
    }
  }

  // 3. Standard proxy forwarded chain
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0];
    const normalized = normalizeIpAddress(first);
    if (normalized) {
      return normalized;
    }
  }

  // 4. Missing or unparseable identity: map to sentinel pool
  return UNRESOLVED_CLIENT_IDENTITY;
}

/**
 * Resolves the server-side HMAC secret for researcher rate limiting.
 * Priority:
 *   1. RESEARCHER_RATE_LIMIT_SECRET (dedicated high-entropy secret)
 *   2. RESEARCHER_REPORT_PASSWORD (fallback to preserve operational continuity)
 * In production, fails loudly if neither is configured.
 */
export function getRateLimitSecret(): string {
  const dedicated = process.env.RESEARCHER_RATE_LIMIT_SECRET?.trim();
  if (dedicated && dedicated.length >= 16) {
    return dedicated;
  }
  const fallback = process.env.RESEARCHER_REPORT_PASSWORD?.trim();
  if (fallback && fallback.length > 0) {
    return `rl_hmac_fallback:${fallback}`;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing security configuration: RESEARCHER_RATE_LIMIT_SECRET or RESEARCHER_REPORT_PASSWORD must be configured in production."
    );
  }
  return "dev_rate_limit_secret_for_tests_only";
}

/**
 * Creates a privacy-preserving keyed HMAC-SHA256 hash of the client identity.
 * Raw IP addresses are NEVER persisted in the database.
 * Keyed hashing prevents offline rainbow-table precomputation against IPv4/IPv6 address space.
 */
export function hashClientIdentity(ip: string): string {
  const secret = getRateLimitSecret();
  const normalized = ip.trim().toLowerCase();
  return crypto
    .createHmac("sha256", secret)
    .update(`researcher_rl_v2:${normalized}`)
    .digest("hex");
}

export interface RateLimitCheckResult {
  allowed: boolean;
  failedCount: number;
  retryAfterSeconds: number;
  serviceUnavailable?: boolean;
}

/**
 * Checks whether the client identity has exceeded the failed login attempts threshold
 * in the rolling 15-minute window.
 *
 * Concurrency Guarantee:
 *   Approximate distributed throttling. Without global distributed locking or serialized
 *   transaction isolation across serverless replicas, simultaneous sub-millisecond concurrent
 *   bursts may interleave before the threshold locks out the client identity for 15 minutes.
 *
 * Fail-Closed Invariant: If database is unreachable, returns serviceUnavailable=true (HTTP 503),
 * guaranteeing that rate-limit protection cannot be bypassed during datastore outages.
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
    // Fail closed: database outage blocks access with HTTP 503 rather than allowing unthrottled attempts
    console.error("checkResearcherRateLimit storage failure (failing closed):", err);
    return {
      allowed: false,
      failedCount: 0,
      retryAfterSeconds: 60,
      serviceUnavailable: true,
    };
  }
}

/**
 * Records a single failed login attempt for the client hash.
 * Also prunes expired records older than 1 hour to prevent unbounded growth.
 * Returns true if successfully recorded, false on datastore error.
 */
export async function recordResearcherFailedAttempt(clientHash: string): Promise<boolean> {
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

    return true;
  } catch (err) {
    console.error("recordResearcherFailedAttempt storage failure:", err);
    return false;
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
    console.error("clearResearcherRateLimit storage failure:", err);
  }
}
