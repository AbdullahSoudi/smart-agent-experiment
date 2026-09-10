/**
 * Deterministic Scenario Transitions
 *
 * Source of Truth: SCENARIO_SPEC.md (Version 1.0 Frozen)
 * Architecture Rule: The AI evaluator classifies student answers; application code
 * owns all state transitions and branching deterministically.
 */

import type { NodeId } from "./scenario";

export type Classification = "advanced" | "medium" | "weak";

export type EvaluatedNodeId =
  | "N1"
  | "N1_H"
  | "N2"
  | "N3"
  | "N3_H"
  | "N4"
  | "N4_REV"
  | "N5"
  | "N5_H";

export type UnconditionalNodeId = "N1_F" | "N2_H" | "N4_H";

export type TransitionInput =
  | {
      nodeId: EvaluatedNodeId;
      classification: Classification;
    }
  | {
      nodeId: UnconditionalNodeId;
      classification?: never;
    }
  | {
      nodeId: "END";
      classification?: never;
    };

/**
 * Returns the deterministic next node in the learning scenario based on the
 * current node and (where applicable) the student answer classification.
 *
 * - Evaluated nodes require an approved classification (advanced | medium | weak).
 * - Unconditional nodes (N1_F, N2_H, N4_H) route without requiring classification.
 * - END returns null (no subsequent node).
 */
export function getNextNode(input: TransitionInput): NodeId | null {
  switch (input.nodeId) {
    // --------------------------------------------------
    // N1: Setting the starting point
    // --------------------------------------------------
    case "N1":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "N2";
        case "weak":
          return "N1_H";
      }

    // --------------------------------------------------
    // N1_H: Hint / retry on starting point
    // --------------------------------------------------
    case "N1_H":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "N2";
        case "weak":
          return "N1_F";
      }

    // --------------------------------------------------
    // N1_F: Simplified choice rescue (both choices continue to N2)
    // --------------------------------------------------
    case "N1_F":
      return "N2";

    // --------------------------------------------------
    // N2: Understanding customer & problem
    // --------------------------------------------------
    case "N2":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "N3";
        case "weak":
          return "N2_H";
      }

    // --------------------------------------------------
    // N2_H: Scaffolding hint (automatic continuation to N3, no answer required)
    // --------------------------------------------------
    case "N2_H":
      return "N3";

    // --------------------------------------------------
    // N3: Discovering digital gap
    // --------------------------------------------------
    case "N3":
      switch (input.classification) {
        case "advanced":
          return "N4";
        case "medium":
          return "N3_H";
        case "weak":
          return "N2_H";
      }

    // --------------------------------------------------
    // N3_H: Refining gap definition
    // --------------------------------------------------
    case "N3_H":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "N4";
        case "weak":
          return "N2_H";
      }

    // --------------------------------------------------
    // N4: Opportunity formulation & customer value
    // --------------------------------------------------
    case "N4":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "N4_REV";
        case "weak":
          return "N4_H";
      }

    // --------------------------------------------------
    // N4_REV: Technical substep for monetization & economic viability
    // --------------------------------------------------
    case "N4_REV":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "N5";
        case "weak":
          return "N4_H";
      }

    // --------------------------------------------------
    // N4_H: Value proposition reformulation scaffold (saved, no classification required)
    // --------------------------------------------------
    case "N4_H":
      return "N5";

    // --------------------------------------------------
    // N5: Justifying opportunity selection
    // --------------------------------------------------
    case "N5":
      switch (input.classification) {
        case "advanced":
          return "END";
        case "medium":
          return "N5_H";
        case "weak":
          return "N4_H";
      }

    // --------------------------------------------------
    // N5_H: Improving decision justification
    // --------------------------------------------------
    case "N5_H":
      switch (input.classification) {
        case "advanced":
        case "medium":
          return "END";
        case "weak":
          return "N4_H";
      }

    // --------------------------------------------------
    // END: Completion (terminal node, no subsequent node)
    // --------------------------------------------------
    case "END":
      return null;
  }
}
