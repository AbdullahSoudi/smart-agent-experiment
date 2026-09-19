/**
 * Unified Scenario-Aware Node Registry
 *
 * Source of Truth: PROJECT.md & research/scenarios/JOURNEY.md
 * Resolves node definitions dynamically across the 5 scenarios:
 * S1, S2, S3, S4, S5
 *
 * SAFETY INVARIANT:
 * scenario_id / current_scenario is authoritative.
 * S4 and S5 resolve strictly in their own scenario context.
 * Cross-scenario fallback is retained ONLY for legacy sessions lacking scenario_id.
 */

import { getScenarioNode, getScenarioNodes, type Scenario1NodeId } from "../scenario";
import { getScenario2Node, SCENARIO_2_NODES } from "./scenario-2";
import { getScenario3Node, SCENARIO_3_NODES } from "./scenario-3";
import { getScenario4Node, SCENARIO_4_NODES } from "./scenario-4";
import { getScenario5Node, SCENARIO_5_NODES } from "./scenario-5";
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
  version: string = "2.0"
): UnifiedNodeView {
  // Scenario 4 strict resolution
  if (scenarioId === 4) {
    if (nodeId in SCENARIO_4_NODES) {
      const node = getScenario4Node(nodeId);
      return {
        id: node.id,
        title: node.title,
        prompt: node.prompt,
        choices: node.choices,
      };
    }
    return {
      id: nodeId,
      title: nodeId,
      prompt: undefined,
    };
  }

  // Scenario 5 strict resolution
  if (scenarioId === 5) {
    if (nodeId in SCENARIO_5_NODES) {
      const node = getScenario5Node(nodeId);
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

  // Scenario 2 strict resolution
  if (scenarioId === 2) {
    if (nodeId in SCENARIO_2_NODES) {
      const node = getScenario2Node(nodeId);
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

  // Scenario 3 strict resolution
  if (scenarioId === 3) {
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

  // Scenario 1
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

  // Legacy fallback guard ONLY when scenarioId was null/undefined
  if (scenarioId === null || scenarioId === undefined) {
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

    if (nodeId in SCENARIO_4_NODES) {
      const node = getScenario4Node(nodeId);
      return {
        id: node.id,
        title: node.title,
        prompt: node.prompt,
        choices: node.choices,
      };
    }

    if (nodeId in SCENARIO_5_NODES) {
      const node = getScenario5Node(nodeId);
      return {
        id: node.id,
        title: node.title,
        prompt: node.prompt,
      };
    }
  }

  return {
    id: nodeId,
    title: nodeId,
    prompt: undefined,
  };
}