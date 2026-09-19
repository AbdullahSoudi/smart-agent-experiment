/**
 * Unified Scenario-Aware Node Registry
 *
 * Source of Truth: PROJECT.md & research/scenarios/JOURNEY.md
 * Resolves node definitions dynamically across the 5 scenarios:
 * S1, S2, S3, S4, S5
 */

import { getScenarioNode, getScenarioNodes, type Scenario1NodeId } from "../scenario";
import { getScenario2Node, SCENARIO_2_NODES, type NodeIdS2 } from "./scenario-2";
import { getScenario3Node, SCENARIO_3_NODES, type NodeIdS3 } from "./scenario-3";
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
  const s1Nodes = getScenarioNodes(version);
  if (nodeId in s1Nodes) {
    const node = s1Nodes[nodeId as Scenario1NodeId];
    return {
      id: node.id,
      title: node.title,
      prompt: node.prompt,
      message: node.message,
      choices: node.choices,
    };
  }

  // Cross-scenario fallbacks if nodeId belongs to S2 or S3
  if (nodeId in SCENARIO_2_NODES) {
    const node = getScenario2Node(nodeId);
    return {
      id: node.id,
      title: node.title,
      prompt: node.prompt,
    };
  }

  if (nodeId in SCENARIO_3_NODES) {
    const node = getScenario3Node(nodeId);
    return {
      id: node.id,
      title: node.title,
      prompt: node.prompt,
    };
  }

  return {
    id: nodeId,
    title: nodeId,
    prompt: undefined,
  };
}
