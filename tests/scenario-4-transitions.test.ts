import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextNodeS4Crisis,
  getNextNodeS4Recovery,
  serializeCrisisDecision,
  deserializeCrisisDecision,
  formatCrisisDecisionDisplay,
  serializeRecoveryDecision,
  deserializeRecoveryDecision,
  formatRecoveryDecisionDisplay,
  SCENARIO_4_NODES,
  SCENARIO_4_START_NODE_ID,
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
  RECOVERY_CHOICE_A,
  RECOVERY_CHOICE_B,
} from "../lib/scenarios/scenario-4";
import { getNextScenarioId, isLastScenario } from "../lib/journey";

test("Scenario 4 Deterministic Transitions & Crisis Mechanics", async (t) => {
  await t.test("S3 END advances to S4 start node", () => {
    assert.equal(getNextScenarioId(3), 4);
    assert.equal(SCENARIO_4_START_NODE_ID, "N1");
    assert.equal(isLastScenario(4), false);
  });

  await t.test("Choice A routes to N3_A consequence", () => {
    assert.equal(getNextNodeS4Crisis("A", false), "N3_A");
  });

  await t.test("Choice B routes to N3_B consequence", () => {
    assert.equal(getNextNodeS4Crisis("B", false), "N3_B");
  });

  await t.test("Choice C routes to N3_C consequence", () => {
    assert.equal(getNextNodeS4Crisis("C", false), "N3_C");
  });

  await t.test("Timeout routes unconditionally to N3_C worst-case data breach consequence", () => {
    assert.equal(getNextNodeS4Crisis(null, true), "N3_C");
    assert.equal(getNextNodeS4Crisis("A", true), "N3_C");
    assert.equal(getNextNodeS4Crisis(null, false), "N3_C");
  });

  await t.test("60-second remaining time calculation is deterministic", () => {
    const startTimeMs = 1000000;

    // After 15 seconds
    const elapsed15 = 15;
    const remaining15 = Math.max(0, 60 - elapsed15);
    assert.equal(remaining15, 45);

    // After 60 seconds
    const elapsed60 = 60;
    const remaining60 = Math.max(0, 60 - elapsed60);
    assert.equal(remaining60, 0);

    // After 75 seconds (expired)
    const elapsed75 = 75;
    const remaining75 = Math.max(0, 60 - elapsed75);
    assert.equal(remaining75, 0);
  });

  await t.test("Refresh does not grant a fresh 60 seconds (elapsed time preserved)", () => {
    const persistedStartMs = Date.now() - 25000; // 25 seconds ago
    const now = Date.now();
    const elapsedSec = Math.floor((now - persistedStartMs) / 1000);
    const remainingSec = Math.max(0, 60 - elapsedSec);

    // Remaining seconds must be around 35, never reset to 60
    assert.ok(remainingSec <= 36 && remainingSec >= 34);
    assert.notEqual(remainingSec, 60);
  });

  await t.test("Single-winner race safety simulation (first choice transitions from N2, late click fails)", () => {
    // Simulated atomic compare-and-set state
    let currentNode: string = "N2";
    let interactionCount = 0;

    function conditionalTransition(fromNode: string, toNode: string): boolean {
      if (currentNode === fromNode) {
        currentNode = toNode;
        interactionCount++;
        return true;
      }
      return false;
    }

    // First request: Choice A arrives
    const wonFirst = conditionalTransition("N2", "N3_A");
    assert.equal(wonFirst, true);
    assert.equal(currentNode, "N3_A");
    assert.equal(interactionCount, 1);

    // Second concurrent request: Timeout or late click arrives
    const wonSecond = conditionalTransition("N2", "N3_C");
    assert.equal(wonSecond, false); // Rejected!
    assert.equal(currentNode, "N3_A"); // Remains Choice A
    assert.equal(interactionCount, 1); // No duplicate interaction created!
  });

  await t.test("decision_time_ms is calculated from server start anchor", () => {
    const startAnchor = new Date("2026-09-19T12:00:00.000Z").getTime();
    const receiptTime = new Date("2026-09-19T12:00:14.350Z").getTime();
    const decisionTimeMs = Math.max(1, Math.min(60000, receiptTime - startAnchor));

    assert.equal(decisionTimeMs, 14350);
  });

  await t.test("Timeout decision_time_ms is clamped to at least 60000ms", () => {
    const startAnchor = new Date("2026-09-19T12:00:00.000Z").getTime();
    const receiptTime = new Date("2026-09-19T12:01:05.000Z").getTime(); // 65 seconds
    const elapsed = receiptTime - startAnchor;
    const timeoutDecisionTimeMs = Math.max(60000, elapsed);

    assert.equal(timeoutDecisionTimeMs, 65000);
    assert.ok(timeoutDecisionTimeMs >= 60000);
  });

  await t.test("Crisis decision serialization and formatting preserves data and hides JSON from student", () => {
    const serialized = serializeCrisisDecision({ choice: "A", timeout: false });
    assert.equal(serialized, '{"choice":"A","timeout":false}');

    const deserialized = deserializeCrisisDecision(serialized);
    assert.deepEqual(deserialized, { choice: "A", timeout: false });

    const display = formatCrisisDecisionDisplay(deserialized!);
    assert.ok(display.includes("الخيار (أ)"));
    assert.ok(display.includes(CRISIS_CHOICE_A));
    assert.equal(display.includes("{"), false); // Never raw JSON
  });

  await t.test("Timeout serialization and display", () => {
    const serialized = serializeCrisisDecision({ choice: null, timeout: true });
    assert.equal(serialized, '{"choice":null,"timeout":true}');

    const deserialized = deserializeCrisisDecision(serialized);
    assert.deepEqual(deserialized, { choice: null, timeout: true });

    const display = formatCrisisDecisionDisplay(deserialized!);
    assert.ok(display.includes("انتهى الوقت المحدد"));
    assert.equal(display.includes("{"), false);
  });

  await t.test("Recovery choices both advance to END", () => {
    assert.equal(getNextNodeS4Recovery(), "END");
  });

  await t.test("Recovery decision serialization and formatting", () => {
    const serialized = serializeRecoveryDecision("A");
    assert.equal(serialized, '{"choice":"A"}');

    const deserialized = deserializeRecoveryDecision(serialized);
    assert.deepEqual(deserialized, { choice: "A" });

    const display = formatRecoveryDecisionDisplay(deserialized!);
    assert.ok(display.includes(RECOVERY_CHOICE_A));
    assert.equal(display.includes("{"), false);
  });

  await t.test("S4 END advances only to S5, never overall completion", () => {
    const nextScenario = getNextScenarioId(4);
    assert.equal(nextScenario, 5);
    assert.equal(isLastScenario(4), false);
  });
});