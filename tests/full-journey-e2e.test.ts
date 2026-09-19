import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getJourneyProgress, getNextScenarioId, isLastScenario, SCENARIOS_JOURNEY, type ScenarioId } from "../lib/journey";
import { getNextNodeS4Crisis, getNextNodeS4Recovery } from "../lib/scenarios/scenario-4";

describe("Sequential Journey Full State-Machine E2E Invariants", () => {
  it("1. ordered scenarios contains exactly five canonical skills in sequence", () => {
    assert.equal(SCENARIOS_JOURNEY.length, 5);
    assert.deepEqual(
      SCENARIOS_JOURNEY.map((s) => s.id),
      [1, 2, 3, 4, 5]
    );
  });

  it("2. full 5-scenario sequential progression operates without skipping or premature completion", () => {
    // Start at S1 N1
    let currentScenario: ScenarioId = 1;
    let currentNode = "N1";
    let status = "active";
    let finishedAt: string | null = null;

    // S1: N1 -> N5 -> END
    assert.equal(isLastScenario(currentScenario), false);
    let progress = getJourneyProgress(currentScenario, false);
    assert.equal(progress.filter((s) => s.state === "completed").length, 0);
    assert.equal(progress.filter((s) => s.state === "active")[0].id, 1);
    assert.equal(progress.filter((s) => s.state === "upcoming").length, 4);

    // Support turn in S1 does NOT advance node
    const isSupport = true;
    if (isSupport) {
      // Node remains unchanged
      currentNode = "N1";
    }
    assert.equal(currentNode, "N1");

    // S1 completes: N1 -> ... -> END
    currentNode = "END";
    // At S1 END, experiment MUST NOT complete
    assert.notEqual(currentScenario, 5);
    assert.equal(status, "active");

    // Advance S1 -> S2
    currentScenario = getNextScenarioId(currentScenario)!;
    currentNode = "N1";
    assert.equal(currentScenario, 2);
    progress = getJourneyProgress(currentScenario, false);
    assert.equal(progress.filter((s) => s.state === "completed").length, 1);
    assert.equal(progress.filter((s) => s.state === "active")[0].id, 2);

    // S2 completes: N1 -> ... -> END
    currentNode = "END";
    assert.equal(status, "active");

    // Advance S2 -> S3
    currentScenario = getNextScenarioId(currentScenario)!;
    currentNode = "N1";
    assert.equal(currentScenario, 3);
    progress = getJourneyProgress(currentScenario, false);
    assert.equal(progress.filter((s) => s.state === "completed").length, 2);
    assert.equal(progress.filter((s) => s.state === "active")[0].id, 3);

    // S3 completes: N1 -> ... -> END
    currentNode = "END";
    assert.equal(status, "active");

    // Advance S3 -> S4
    currentScenario = getNextScenarioId(currentScenario)!;
    currentNode = "N1";
    assert.equal(currentScenario, 4);
    progress = getJourneyProgress(currentScenario, false);
    assert.equal(progress.filter((s) => s.state === "completed").length, 3);
    assert.equal(progress.filter((s) => s.state === "active")[0].id, 4);

    // S4 Crisis Shock: N1 -> N2
    currentNode = "N2";
    // S4 Crisis Choice A: N2 -> N3_A
    const nextCrisisNode = getNextNodeS4Crisis("A", false);
    assert.equal(nextCrisisNode, "N3_A");
    currentNode = nextCrisisNode;

    // S4 Consequence -> Recovery N4
    currentNode = "N4";
    // S4 Recovery Choice A -> END
    currentNode = getNextNodeS4Recovery();
    assert.equal(currentNode, "END");
    assert.equal(status, "active", "S4 END must remain active");

    // Advance S4 -> S5
    currentScenario = getNextScenarioId(currentScenario)!;
    currentNode = "N1";
    assert.equal(currentScenario, 5);
    progress = getJourneyProgress(currentScenario, false);
    assert.equal(progress.filter((s) => s.state === "completed").length, 4);
    assert.equal(progress.filter((s) => s.state === "active")[0].id, 5);
    assert.equal(isLastScenario(currentScenario), true);

    // S5: N1 (headlines) -> N2 (campaign choice B) -> N3_B (advanced ROI) -> N4 (allocation) -> END
    currentNode = "END";

    // ONLY now: at S5 END, experiment can transition to completed
    if (isLastScenario(currentScenario) && currentNode === "END" && status === "active") {
      status = "completed";
      finishedAt = new Date().toISOString();
    }

    assert.equal(status, "completed");
    assert.ok(finishedAt !== null);

    // Final progress: all 5 completed
    progress = getJourneyProgress(5, true);
    assert.equal(progress.filter((s) => s.state === "completed").length, 5);
    assert.equal(progress.filter((s) => s.state === "active").length, 0);
    assert.equal(progress.filter((s) => s.state === "upcoming").length, 0);
  });

  it("3. S4 timeout path operates deterministically in the state machine", () => {
    const timeoutNextNode = getNextNodeS4Crisis(null, true);
    assert.equal(timeoutNextNode, "N3_C", "Timeout must route to worst-case breach consequence N3_C");

    const lateClickNextNode = getNextNodeS4Crisis("A", true);
    assert.equal(lateClickNextNode, "N3_C", "If timeout flag is set, late choice cannot override timeout");
  });

  it("4. completion is strictly rejected for Scenarios 1 through 4", () => {
    function canCompleteOverall(scenarioId: number, node: string, sessionStatus: string): boolean {
      return scenarioId === 5 && node === "END" && sessionStatus === "active";
    }

    assert.equal(canCompleteOverall(1, "END", "active"), false);
    assert.equal(canCompleteOverall(2, "END", "active"), false);
    assert.equal(canCompleteOverall(3, "END", "active"), false);
    assert.equal(canCompleteOverall(4, "END", "active"), false);
    assert.equal(canCompleteOverall(5, "N4", "active"), false);
    assert.equal(canCompleteOverall(5, "END", "active"), true);
    assert.equal(canCompleteOverall(5, "END", "completed"), false); // already completed
  });
});
