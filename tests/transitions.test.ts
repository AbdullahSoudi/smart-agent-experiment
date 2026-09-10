/**
 * Automated Regression Tests for Scenario Transitions
 *
 * Source of Truth: SCENARIO_SPEC.md (Version 1.0 Frozen)
 * Protects: 31 approved deterministic routing cases in lib/transitions.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getNextNode, type TransitionInput } from "../lib/transitions";

interface TestCase {
  readonly description: string;
  readonly input: TransitionInput;
  readonly expected: string | null;
}

const APPROVED_TRANSITIONS: readonly TestCase[] = [
  // 1. N1: Setting starting point
  {
    description: "N1 (advanced) -> N2",
    input: { nodeId: "N1", classification: "advanced" },
    expected: "N2",
  },
  {
    description: "N1 (medium) -> N2",
    input: { nodeId: "N1", classification: "medium" },
    expected: "N2",
  },
  {
    description: "N1 (weak) -> N1_H",
    input: { nodeId: "N1", classification: "weak" },
    expected: "N1_H",
  },

  // 2. N1_H: Starting point retry
  {
    description: "N1_H (advanced) -> N2",
    input: { nodeId: "N1_H", classification: "advanced" },
    expected: "N2",
  },
  {
    description: "N1_H (medium) -> N2",
    input: { nodeId: "N1_H", classification: "medium" },
    expected: "N2",
  },
  {
    description: "N1_H (weak) -> N1_F",
    input: { nodeId: "N1_H", classification: "weak" },
    expected: "N1_F",
  },

  // 3. N1_F: Simplified choice rescue (unconditional -> N2)
  {
    description: "N1_F (unconditional) -> N2",
    input: { nodeId: "N1_F" },
    expected: "N2",
  },

  // 4. N2: Understanding customers & problem
  {
    description: "N2 (advanced) -> N3",
    input: { nodeId: "N2", classification: "advanced" },
    expected: "N3",
  },
  {
    description: "N2 (medium) -> N3",
    input: { nodeId: "N2", classification: "medium" },
    expected: "N3",
  },
  {
    description: "N2 (weak) -> N2_H",
    input: { nodeId: "N2", classification: "weak" },
    expected: "N2_H",
  },

  // 5. N2_H: Scaffolding hint (unconditional -> N3)
  {
    description: "N2_H (unconditional) -> N3",
    input: { nodeId: "N2_H" },
    expected: "N3",
  },

  // 6. N3: Discovering digital gap
  {
    description: "N3 (advanced) -> N4",
    input: { nodeId: "N3", classification: "advanced" },
    expected: "N4",
  },
  {
    description: "N3 (medium) -> N3_H",
    input: { nodeId: "N3", classification: "medium" },
    expected: "N3_H",
  },
  {
    description: "N3 (weak) -> N2_H",
    input: { nodeId: "N3", classification: "weak" },
    expected: "N2_H",
  },

  // 7. N3_H: Refining gap definition
  {
    description: "N3_H (advanced) -> N4",
    input: { nodeId: "N3_H", classification: "advanced" },
    expected: "N4",
  },
  {
    description: "N3_H (medium) -> N4",
    input: { nodeId: "N3_H", classification: "medium" },
    expected: "N4",
  },
  {
    description: "N3_H (weak) -> N2_H",
    input: { nodeId: "N3_H", classification: "weak" },
    expected: "N2_H",
  },

  // 8. N4: Opportunity formulation & customer value
  {
    description: "N4 (advanced) -> N4_REV",
    input: { nodeId: "N4", classification: "advanced" },
    expected: "N4_REV",
  },
  {
    description: "N4 (medium) -> N4_REV",
    input: { nodeId: "N4", classification: "medium" },
    expected: "N4_REV",
  },
  {
    description: "N4 (weak) -> N4_H",
    input: { nodeId: "N4", classification: "weak" },
    expected: "N4_H",
  },

  // 9. N4_REV: Technical substep for monetization
  {
    description: "N4_REV (advanced) -> N5",
    input: { nodeId: "N4_REV", classification: "advanced" },
    expected: "N5",
  },
  {
    description: "N4_REV (medium) -> N5",
    input: { nodeId: "N4_REV", classification: "medium" },
    expected: "N5",
  },
  {
    description: "N4_REV (weak) -> N4_H",
    input: { nodeId: "N4_REV", classification: "weak" },
    expected: "N4_H",
  },

  // 10. N4_H: Value proposition reformulation (unconditional -> N5)
  {
    description: "N4_H (unconditional) -> N5",
    input: { nodeId: "N4_H" },
    expected: "N5",
  },

  // 11. N5: Justifying opportunity selection
  {
    description: "N5 (advanced) -> END",
    input: { nodeId: "N5", classification: "advanced" },
    expected: "END",
  },
  {
    description: "N5 (medium) -> N5_H",
    input: { nodeId: "N5", classification: "medium" },
    expected: "N5_H",
  },
  {
    description: "N5 (weak) -> N4_H",
    input: { nodeId: "N5", classification: "weak" },
    expected: "N4_H",
  },

  // 12. N5_H: Improving decision justification
  {
    description: "N5_H (advanced) -> END",
    input: { nodeId: "N5_H", classification: "advanced" },
    expected: "END",
  },
  {
    description: "N5_H (medium) -> END",
    input: { nodeId: "N5_H", classification: "medium" },
    expected: "END",
  },
  {
    description: "N5_H (weak) -> N4_H",
    input: { nodeId: "N5_H", classification: "weak" },
    expected: "N4_H",
  },

  // 13. END: Terminal node (unconditional -> null)
  {
    description: "END (unconditional) -> null",
    input: { nodeId: "END" },
    expected: null,
  },
];

describe("Deterministic Scenario Transitions (SCENARIO_SPEC v1.0)", () => {
  it("should contain exactly 31 approved routing cases", () => {
    assert.equal(APPROVED_TRANSITIONS.length, 31);
  });

  for (const tc of APPROVED_TRANSITIONS) {
    it(`routes correctly for ${tc.description}`, () => {
      const actual = getNextNode(tc.input);
      assert.equal(
        actual,
        tc.expected,
        `Routing failed for ${tc.description}: expected ${tc.expected}, got ${actual}`
      );
    });
  }

  // Key recovery and architectural regression checks
  describe("Key recovery and edge-case guarantees", () => {
    it("guarantees N1_F unconditionally routes to N2 regardless of choice", () => {
      assert.equal(getNextNode({ nodeId: "N1_F" }), "N2");
    });

    it("guarantees N2_H unconditionally routes to N3 without classification", () => {
      assert.equal(getNextNode({ nodeId: "N2_H" }), "N3");
    });

    it("guarantees N4_H unconditionally routes to N5 without classification", () => {
      assert.equal(getNextNode({ nodeId: "N4_H" }), "N5");
    });

    it("guarantees N4_REV correctly routes to N5 (adv/med) and N4_H (weak)", () => {
      assert.equal(getNextNode({ nodeId: "N4_REV", classification: "advanced" }), "N5");
      assert.equal(getNextNode({ nodeId: "N4_REV", classification: "medium" }), "N5");
      assert.equal(getNextNode({ nodeId: "N4_REV", classification: "weak" }), "N4_H");
    });

    it("guarantees END terminal node returns null", () => {
      assert.equal(getNextNode({ nodeId: "END" }), null);
    });

    it("guarantees N3 weak recovers to N2_H", () => {
      assert.equal(getNextNode({ nodeId: "N3", classification: "weak" }), "N2_H");
    });

    it("guarantees N5 weak recovers to N4_H", () => {
      assert.equal(getNextNode({ nodeId: "N5", classification: "weak" }), "N4_H");
    });
  });
});
