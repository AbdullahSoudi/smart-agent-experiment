/**
 * Regression Test: Frontend-to-API Route Contract
 *
 * Source: QA Audit DEFECT P0-001 & P1-002
 * Protects against:
 *   - Broken or missing API endpoints referenced by frontend handlers
 *   - Fallback to non-existent endpoints (e.g. /api/chat returning 404)
 *   - Unmapped Scenario 1 nodes in handleSendMessage
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

describe("Frontend-to-API Route Contract Verification", () => {
  // All conversational Scenario 1 nodes and their mandatory API endpoints
  const S1_CONVERSATIONAL_NODE_ENDPOINTS: Record<string, string> = {
    N1: "/api/n1/submit",
    N1_H: "/api/n1-h/submit",
    N2: "/api/n2/submit",
    N3: "/api/n3/submit",
    N3_H: "/api/n3-h/submit",
    N4: "/api/n4/submit",
    N4_REV: "/api/n4-rev/submit",
    N4_H: "/api/n4-h/submit", // Audited fix: previously missing, causing /api/chat 404
    N5: "/api/n5/submit",
    N5_H: "/api/n5-h/submit",
  };

  it("every Scenario 1 conversational node maps to an existing API route file", () => {
    for (const [nodeId, endpoint] of Object.entries(S1_CONVERSATIONAL_NODE_ENDPOINTS)) {
      const routeRelPath = path.join("app", endpoint, "route.ts");
      const routeAbsPath = path.resolve(ROOT_DIR, routeRelPath);
      assert.ok(
        fs.existsSync(routeAbsPath),
        `Missing route file for Scenario 1 node ${nodeId}: ${routeRelPath}`
      );
    }
  });

  // Dedicated Scenario 1 non-conversational action endpoints
  const S1_ACTION_ENDPOINTS = [
    { label: "N1_F Quick Choice", endpoint: "/api/n1-f/submit" },
    { label: "N2_H Auto Continue", endpoint: "/api/n2-h/continue" },
  ];

  it("every Scenario 1 action endpoint maps to an existing API route file", () => {
    for (const action of S1_ACTION_ENDPOINTS) {
      const routeRelPath = path.join("app", action.endpoint, "route.ts");
      const routeAbsPath = path.resolve(ROOT_DIR, routeRelPath);
      assert.ok(
        fs.existsSync(routeAbsPath),
        `Missing route file for ${action.label}: ${routeRelPath}`
      );
    }
  });

  // High-level Scenario endpoints (S2 through S5)
  const SCENARIO_ENDPOINTS = [
    { label: "Scenario 2 Conversational Submit", endpoint: "/api/s2/submit" },
    { label: "Scenario 3 Structured & Conversational Submit", endpoint: "/api/s3/submit" },
    { label: "Scenario 4 Crisis Start", endpoint: "/api/s4/start" },
    { label: "Scenario 4 Crisis Submit", endpoint: "/api/s4/submit" },
    { label: "Scenario 5 Campaign & Allocation Submit", endpoint: "/api/s5/submit" },
  ];

  it("every multi-scenario submit endpoint exists on disk", () => {
    for (const sc of SCENARIO_ENDPOINTS) {
      const routeRelPath = path.join("app", sc.endpoint, "route.ts");
      const routeAbsPath = path.resolve(ROOT_DIR, routeRelPath);
      assert.ok(
        fs.existsSync(routeAbsPath),
        `Missing route file for ${sc.label}: ${routeRelPath}`
      );
    }
  });

  // Session lifecycle endpoints
  const SESSION_ENDPOINTS = [
    { label: "Session Start", endpoint: "/api/session/start" },
    { label: "Session Restore", endpoint: "/api/session/restore" },
    { label: "Session Advance", endpoint: "/api/session/advance" },
    { label: "Session Complete", endpoint: "/api/session/complete" },
  ];

  it("every session lifecycle endpoint exists on disk", () => {
    for (const sess of SESSION_ENDPOINTS) {
      const routeRelPath = path.join("app", sess.endpoint, "route.ts");
      const routeAbsPath = path.resolve(ROOT_DIR, routeRelPath);
      assert.ok(
        fs.existsSync(routeAbsPath),
        `Missing route file for ${sess.label}: ${routeRelPath}`
      );
    }
  });

  // Researcher administration endpoints
  const RESEARCH_ENDPOINTS = [
    { label: "Research Login", endpoint: "/api/research/login" },
    { label: "Research Data", endpoint: "/api/research/data" },
    { label: "Research Export", endpoint: "/api/research/export" },
    { label: "Research Logout", endpoint: "/api/research/logout" },
  ];

  it("every researcher administrative endpoint exists on disk", () => {
    for (const res of RESEARCH_ENDPOINTS) {
      const routeRelPath = path.join("app", res.endpoint, "route.ts");
      const routeAbsPath = path.resolve(ROOT_DIR, routeRelPath);
      assert.ok(
        fs.existsSync(routeAbsPath),
        `Missing route file for ${res.label}: ${routeRelPath}`
      );
    }
  });

  it("guarantees app/chat/page.tsx has no unmapped fallback to /api/chat", () => {
    const chatPagePath = path.resolve(ROOT_DIR, "app/chat/page.tsx");
    const content = fs.readFileSync(chatPagePath, "utf-8");

    // Must map N4_H explicitly
    assert.match(
      content,
      /currentNodeId\s*===\s*["']N4_H["']\s*\?\s*["']\/api\/n4-h\/submit["']/,
      "app/chat/page.tsx must explicitly map N4_H to /api/n4-h/submit"
    );

    // Must NOT fall back to "/api/chat"
    assert.doesNotMatch(
      content,
      /endpoint\s*=\s*["']\/api\/chat["']/,
      "app/chat/page.tsx must not default endpoint to /api/chat"
    );
    assert.doesNotMatch(
      content,
      /:\s*["']\/api\/chat["']/,
      "app/chat/page.tsx must not use /api/chat as a ternary fallback"
    );
  });
});
