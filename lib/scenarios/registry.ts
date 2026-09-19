/**
 * Unified Scenario-Aware Node Registry
 *
 * Source of Truth: PROJECT.md & research/scenarios/JOURNEY.md
 * Resolves node definitions dynamically across the 5 scenarios:
 * S1, S2, S3, S4, S5
 */

import { getScenarioNode, type ScenarioNode } from "../scenario";
import { getScenario2Node, type Scenario2Node } from "./scenario-2";
import { getScenario3Node, type Scenario3Node } from "./scenario-3";
import type { ScenarioId } from "../journey";

export interface UnifiedNodeView {
  id: string;
  title: string;
  prompt?: string;
  message?: string;
  choices?: readonly string[];
}

/**
 * Resolves the node definition based on current_scenario and current_node.
 */
export function getScenarioNodeByContext(
  scenarioId: ScenarioId | number | null | undefined,
  nodeId: string,
  version: string = "2.0-dev"
): UnifiedNodeView {
  const safeScenario = typeof scenarioId === "number" ? scenarioId : 1;

  if (safeScenario === 2) {
    const node = getScenario2Node(nodeId);
    return {
      id: node.id,
      title: node.title,
      prompt: node.prompt,
    };
  }

  if (safeScenario === 3) {
    const node = getScenario3Node(nodeId);
    return {
      id: node.id,
      title: node.title,
      prompt: node.prompt,
    };
  }

  // Scenario 1 (Default / Historical fallback)
  const node = getScenarioNode(nodeId as any, version);
  return {
    id: node.id,
    title: node.title,
    prompt: node.prompt,
    message: node.message,
    choices: node.choices,
  };
}