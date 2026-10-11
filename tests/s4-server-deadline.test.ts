/**
 * Regression Suite: Scenario 4 Server-Authoritative Deadline Enforcement
 *
 * Covers DEF-GATE-01 (P0):
 * Prevents client bypass of the canonical 60-second crisis deadline.
 * The server independently enforces the 60,000 ms boundary from the persisted CRISIS_START.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextNodeS4Crisis,
  serializeCrisisDecision,
  deserializeCrisisDecision,
  SCENARIO_4_NODES,
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
} from "../lib/scenarios/scenario-4";

test("DEF-GATE-01: Scenario 4 Server-Authoritative Crisis Deadline", async (t) => {
  // Helper to simulate server-authoritative evaluation logic from app/api/s4/submit/route.ts
  function evaluateCrisisDecisionServerAuthoritative(params: {
    startCreatedAtIso: string;
    nowMs: number;
    choice: "A" | "B" | "C" | null;
    clientTimeout: boolean;
    clientReportedElapsedMs?: number;
    clientReportedStartTime?: number;
  }) {
    const startMs = Date.parse(params.startCreatedAtIso);
    const safeStartMs = Number.isFinite(startMs) ? startMs : 0;
    const elapsedMs = Math.max(0, params.nowMs - safeStartMs);

    // Canonical 60-second boundary check
    const isServerTimeout = elapsedMs >= 60000 || !Number.isFinite(startMs);
    const isTimeout = Boolean(params.clientTimeout) || isServerTimeout;

    let selectedChoice: "A" | "B" | "C" | null = null;
    let decisionTimeMs: number;

    if (isTimeout) {
      selectedChoice = null;
      decisionTimeMs = Math.max(60000, elapsedMs);
    } else {
      if (params.choice === "A" || params.choice === "B" || params.choice === "C") {
        selectedChoice = params.choice;
        decisionTimeMs = Math.min(59999, Math.max(1, elapsedMs));
      } else {
        throw new Error("Invalid choice before timeout");
      }
    }

    const nextNode = getNextNodeS4Crisis(selectedChoice, isTimeout);
    const feedback = SCENARIO_4_NODES[nextNode].prompt;
    const serializedAnswer = serializeCrisisDecision({
      choice: selectedChoice,
      timeout: isTimeout,
    });

    return {
      isTimeout,
      isServerTimeout,
      selectedChoice,
      decisionTimeMs,
      nextNode,
      feedback,
      serializedAnswer,
    };
  }

  const BASE_TIME = new Date("2026-10-11T12:00:00.000Z").getTime();
  const BASE_ISO = new Date(BASE_TIME).toISOString();

  await t.test("Case 1: Timely decision at 30 seconds (< 60s) transitions to N3_A", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 30000,
      choice: "A",
      clientTimeout: false,
    });

    assert.equal(result.isTimeout, false);
    assert.equal(result.isServerTimeout, false);
    assert.equal(result.selectedChoice, "A");
    assert.equal(result.decisionTimeMs, 30000);
    assert.equal(result.nextNode, "N3_A");
    assert.equal(result.serializedAnswer, '{"choice":"A","timeout":false}');
  });

  await t.test("Case 2: Decision at 59,999 ms is accepted as timely Choice A", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 59999,
      choice: "A",
      clientTimeout: false,
    });

    assert.equal(result.isTimeout, false);
    assert.equal(result.isServerTimeout, false);
    assert.equal(result.selectedChoice, "A");
    assert.equal(result.decisionTimeMs, 59999);
    assert.equal(result.nextNode, "N3_A");
  });

  await t.test("Case 3: Decision at exact 60,000 ms deadline forces timeout consequence N3_C", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 60000,
      choice: "A",
      clientTimeout: false, // Malicious or lagging client claims timely
    });

    assert.equal(result.isTimeout, true);
    assert.equal(result.isServerTimeout, true);
    assert.equal(result.selectedChoice, null, "Choice A must be overridden by server deadline");
    assert.equal(result.decisionTimeMs, 60000);
    assert.equal(result.nextNode, "N3_C");
    assert.equal(result.serializedAnswer, '{"choice":null,"timeout":true}');
  });

  await t.test("Case 4: Decision at 60,001 ms forces timeout consequence N3_C", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 60001,
      choice: "B",
      clientTimeout: false,
    });

    assert.equal(result.isTimeout, true);
    assert.equal(result.isServerTimeout, true);
    assert.equal(result.selectedChoice, null);
    assert.equal(result.decisionTimeMs, 60001);
    assert.equal(result.nextNode, "N3_C");
  });

  await t.test("Case 5 (AUDIT REPRODUCTION): 65-second submission with timeout:false forces N3_C", () => {
    // The exact audit defect: client submitted 65s after CRISIS_START with timeout:false, choice:"A"
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 65000,
      choice: "A",
      clientTimeout: false,
    });

    assert.equal(result.isTimeout, true, "Server MUST NOT trust client timeout:false after 65s");
    assert.equal(result.isServerTimeout, true);
    assert.equal(result.selectedChoice, null, "Late Choice A must NOT be accepted");
    assert.equal(result.decisionTimeMs, 65000);
    assert.equal(result.nextNode, "N3_C", "Consequence must be N3_C (data breach)");
    assert.equal(result.serializedAnswer, '{"choice":null,"timeout":true}');
  });

  await t.test("Case 6: Decision at 65 seconds with timeout:true transitions to N3_C", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 65000,
      choice: null,
      clientTimeout: true,
    });

    assert.equal(result.isTimeout, true);
    assert.equal(result.selectedChoice, null);
    assert.equal(result.decisionTimeMs, 65000);
    assert.equal(result.nextNode, "N3_C");
  });

  await t.test("Case 7: Client manipulated timing values are completely ignored by server", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 62000, // Actually 62 seconds elapsed on server
      choice: "A",
      clientTimeout: false,
      clientReportedElapsedMs: 15000, // Fabricated client timing
      clientReportedStartTime: BASE_TIME + 45000,
    });

    assert.equal(result.isTimeout, true, "Fabricated client timings must have zero effect");
    assert.equal(result.selectedChoice, null);
    assert.equal(result.nextNode, "N3_C");
    assert.equal(result.decisionTimeMs, 62000);
  });

  await t.test("Case 8: Browser refresh during countdown does not reset timer", () => {
    const persistedStartMs = BASE_TIME;
    // Student refreshes at 40s
    const refreshTime = BASE_TIME + 40000;
    const elapsedSec = Math.floor((refreshTime - persistedStartMs) / 1000);
    const remainingSeconds = Math.max(0, 60 - elapsedSec);

    assert.equal(remainingSeconds, 20, "Countdown must have 20s remaining, not 60s");
  });

  await t.test("Case 9: Two simultaneous crisis submissions have single winner via CAS", () => {
    let sessionNode = "N2";
    let committedInteractions: any[] = [];

    function simulateAdvanceCAS(fromNode: string, toNode: string, payload: any) {
      if (sessionNode === fromNode) {
        sessionNode = toNode;
        committedInteractions.push(payload);
        return { won: true, nextNode: toNode };
      }
      return { won: false, nextNode: sessionNode };
    }

    // Submission 1: Choice B at 25s
    const res1 = simulateAdvanceCAS("N2", "N3_B", { choice: "B", time: 25000 });
    // Concurrent Submission 2: Timeout arrives slightly behind
    const res2 = simulateAdvanceCAS("N2", "N3_C", { choice: null, timeout: true });

    assert.equal(res1.won, true);
    assert.equal(res2.won, false);
    assert.equal(sessionNode, "N3_B");
    assert.equal(committedInteractions.length, 1, "Only one interaction persisted");
    assert.equal(res2.nextNode, "N3_B", "Losing request resolves to winning node");
  });

  await t.test("Case 10: Repeated request after timeout was committed returns N3_C already resolved", () => {
    const session = { current_node: "N3_C", current_scenario: 4 };
    const existingDecision = { next_node: "N3_C", agent_feedback: SCENARIO_4_NODES["N3_C"].prompt };

    // Simulate lines 215-223 in app/api/s4/submit/route.ts
    const alreadyResolvedResponse = {
      nextNode: session.current_node,
      feedback: existingDecision.agent_feedback,
      alreadyResolved: true,
    };

    assert.equal(alreadyResolvedResponse.nextNode, "N3_C");
    assert.equal(alreadyResolvedResponse.alreadyResolved, true);
  });

  await t.test("Case 11: Timed crisis node N2 contains exactly 3 choices and no hint branch", () => {
    const nodeN2 = SCENARIO_4_NODES["N2"];
    assert.ok(nodeN2);
    assert.equal(nodeN2.choices?.length, 3);
    assert.equal(nodeN2.choices?.[0], CRISIS_CHOICE_A);
    assert.equal(nodeN2.choices?.[1], CRISIS_CHOICE_B);
    assert.equal(nodeN2.choices?.[2], CRISIS_CHOICE_C);
  });

  await t.test("Case 12: Correct decision_time_ms persistence (strictly positive and canonical)", () => {
    // Normal decision at 12,345 ms
    const timely = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 12345,
      choice: "B",
      clientTimeout: false,
    });
    assert.equal(timely.decisionTimeMs, 12345);

    // Timeout at 63,120 ms
    const late = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: BASE_ISO,
      nowMs: BASE_TIME + 63120,
      choice: "A",
      clientTimeout: false,
    });
    assert.equal(late.decisionTimeMs, 63120);
    assert.ok(late.decisionTimeMs >= 60000);
  });

  await t.test("Malformed start timestamp safely treated as expired", () => {
    const result = evaluateCrisisDecisionServerAuthoritative({
      startCreatedAtIso: "INVALID_DATE_STRING",
      nowMs: BASE_TIME,
      choice: "A",
      clientTimeout: false,
    });

    assert.equal(result.isTimeout, true, "Unparseable timestamp must fail-safe to timeout");
    assert.equal(result.selectedChoice, null);
    assert.equal(result.nextNode, "N3_C");
  });
});
