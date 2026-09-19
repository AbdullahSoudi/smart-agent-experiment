import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  isResearcherAuthConfigured,
  verifyResearcherPassword,
  createResearcherToken,
  verifyResearcherToken,
  validateResearcherRequest,
  parseCookies,
  RESEARCHER_COOKIE_NAME,
} from "../lib/server/research-auth";

describe("Researcher Auth & Access Invariants", () => {
  const originalPassword = process.env.RESEARCHER_REPORT_PASSWORD;

  it("1. unconfigured environment rejects authentication safely", () => {
    delete process.env.RESEARCHER_REPORT_PASSWORD;
    assert.equal(isResearcherAuthConfigured(), false);
    assert.equal(verifyResearcherPassword("any-pass"), false);
    assert.equal(verifyResearcherPassword(""), false);

    const mockReq = new Request("http://localhost:3000/api/research/data");
    const authResult = validateResearcherRequest(mockReq);
    assert.equal(authResult.authorized, false);
    assert.equal(authResult.status, "not_configured");
  });

  it("2. wrong password is rejected without revealing configuration details", () => {
    process.env.RESEARCHER_REPORT_PASSWORD = "researcher-strong-pass-2026";
    assert.equal(isResearcherAuthConfigured(), true);

    assert.equal(verifyResearcherPassword("wrong-pass"), false);
    assert.equal(verifyResearcherPassword("RESEARCHER-STRONG-PASS-2026"), false);
    assert.equal(verifyResearcherPassword(""), false);
    assert.equal(verifyResearcherPassword(" researcher-strong-pass-2026-extra"), false);
  });

  it("3. correct password passes verification", () => {
    process.env.RESEARCHER_REPORT_PASSWORD = "researcher-strong-pass-2026";
    assert.equal(verifyResearcherPassword("researcher-strong-pass-2026"), true);
  });

  it("4. signed token creates valid session and passes verification", () => {
    const secret = "test-secret-key-12345";
    const token = createResearcherToken(secret);

    assert.ok(typeof token === "string");
    assert.ok(token.includes("."));

    const isValid = verifyResearcherToken(token, secret);
    assert.equal(isValid, true);
  });

  it("5. tampered token is strictly rejected", () => {
    const secret = "test-secret-key-12345";
    const token = createResearcherToken(secret);

    // Tamper with payload
    const tamperedPayload = "9999999999" + token.slice(10);
    assert.equal(verifyResearcherToken(tamperedPayload, secret), false);

    // Tamper with signature
    const tamperedSig = token + "bad";
    assert.equal(verifyResearcherToken(tamperedSig, secret), false);

    // Wrong secret
    assert.equal(verifyResearcherToken(token, "other-secret-key"), false);
  });

  it("6. expired token is rejected", () => {
    const secret = "test-secret-key-12345";
    // Token with timestamp 10 hours ago
    const pastTimestamp = Date.now() - 10 * 60 * 60 * 1000;
    const payload = `${pastTimestamp}:deadbeef`;
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const expiredToken = `${payload}.${signature}`;

    assert.equal(verifyResearcherToken(expiredToken, secret), false);
  });

  it("7. request with valid cookie passes validateResearcherRequest", () => {
    process.env.RESEARCHER_REPORT_PASSWORD = "researcher-strong-pass-2026";
    const token = createResearcherToken("researcher-strong-pass-2026");

    const mockReq = new Request("http://localhost:3000/api/research/data", {
      headers: {
        cookie: `${RESEARCHER_COOKIE_NAME}=${token}; other_cookie=123`,
      },
    });

    const authResult = validateResearcherRequest(mockReq);
    assert.equal(authResult.authorized, true);
    assert.equal(authResult.status, "ok");
  });

  it("8. request without cookie fails validateResearcherRequest with unauthorized", () => {
    process.env.RESEARCHER_REPORT_PASSWORD = "researcher-strong-pass-2026";
    const mockReq = new Request("http://localhost:3000/api/research/data");
    const authResult = validateResearcherRequest(mockReq);
    assert.equal(authResult.authorized, false);
    assert.equal(authResult.status, "unauthorized");
  });

  it("9. cookie parser handles empty and malformed headers gracefully", () => {
    assert.deepEqual(parseCookies(null), {});
    assert.deepEqual(parseCookies(""), {});
    assert.deepEqual(parseCookies("a=1; b=hello%20world; c="), { a: "1", b: "hello world", c: "" });

    // Restore original env
    if (originalPassword) {
      process.env.RESEARCHER_REPORT_PASSWORD = originalPassword;
    } else {
      delete process.env.RESEARCHER_REPORT_PASSWORD;
    }
  });
});
