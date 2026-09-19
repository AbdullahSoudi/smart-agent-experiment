import crypto from "crypto";

export const RESEARCHER_COOKIE_NAME = "researcher_session";
export const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

/**
 * Returns true if the researcher report password is configured in the environment.
 */
export function isResearcherAuthConfigured(): boolean {
  const secret = process.env.RESEARCHER_REPORT_PASSWORD;
  return typeof secret === "string" && secret.trim().length > 0;
}

/**
 * Verifies researcher password using timing-safe comparison.
 * Prevents timing attacks by hashing both input and target with SHA-256 before comparison.
 */
export function verifyResearcherPassword(password: string): boolean {
  if (!isResearcherAuthConfigured()) {
    return false;
  }
  const secret = process.env.RESEARCHER_REPORT_PASSWORD!.trim();
  if (typeof password !== "string" || password.trim().length === 0) {
    return false;
  }

  const inputHash = crypto.createHash("sha256").update(password.trim()).digest();
  const targetHash = crypto.createHash("sha256").update(secret).digest();

  return crypto.timingSafeEqual(inputHash, targetHash);
}

/**
 * Generates an HMAC-SHA256 signed session token.
 */
export function createResearcherToken(secret: string): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${timestamp}:${nonce}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Validates a signed session token, checking signature and expiration.
 */
export function verifyResearcherToken(token: string, secret: string): boolean {
  if (!secret || typeof secret !== "string" || secret.trim().length === 0) {
    return false;
  }
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [payload, signature] = parts;
  const payloadParts = payload.split(":");
  if (payloadParts.length !== 2) {
    return false;
  }

  const timestamp = parseInt(payloadParts[0], 10);
  if (isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  // Check expiration: 8 hours max age, 60s clock skew tolerance
  if (now - timestamp > COOKIE_MAX_AGE_SECONDS * 1000 || timestamp > now + 60000) {
    return false;
  }

  const expectedSignature = crypto.createHmac("sha256", secret.trim()).update(payload).digest("hex");
  const bufSig = Buffer.from(signature, "utf8");
  const bufExpected = Buffer.from(expectedSignature, "utf8");

  if (bufSig.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufSig, bufExpected);
}

/**
 * Parses raw Cookie header string into key-value map.
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name.trim()] = decodeURIComponent(rest.join("=").trim());
    }
  }
  return cookies;
}

/**
 * Validates whether an incoming HTTP request is authenticated as a researcher.
 */
export function validateResearcherRequest(request: Request): {
  authorized: boolean;
  status: "ok" | "unauthorized" | "not_configured";
} {
  if (!isResearcherAuthConfigured()) {
    return { authorized: false, status: "not_configured" };
  }

  const secret = process.env.RESEARCHER_REPORT_PASSWORD!.trim();
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[RESEARCHER_COOKIE_NAME];

  if (!token || !verifyResearcherToken(token, secret)) {
    return { authorized: false, status: "unauthorized" };
  }

  return { authorized: true, status: "ok" };
}

/**
 * Creates HttpOnly, SameSite=Strict cookie header string for researcher session.
 */
export function createResearcherSessionCookieValue(): string {
  const secret = process.env.RESEARCHER_REPORT_PASSWORD!.trim();
  const token = createResearcherToken(secret);
  const isProd = process.env.NODE_ENV === "production";
  return `${RESEARCHER_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE_SECONDS}; ${isProd ? "Secure;" : ""}`;
}

/**
 * Creates expiration cookie header string to clear researcher session.
 */
export function createResearcherLogoutCookieValue(): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${RESEARCHER_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; ${isProd ? "Secure;" : ""}`;
}
