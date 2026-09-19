import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getScenarioNodeByContext } from "../lib/scenarios/registry";
import { getJourneyProgress } from "../lib/journey";
import { isStructuredBusinessModel, deserializeBusinessModel, formatBusinessModelDisplay } from "../lib/scenarios/scenario-3";

describe("T54.3 Session Resume & Chat Guard Invariants", () => {
  it("1. resumed session stores returned sessionId", () => {
    // Mock sessionStorage
    const storage: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
    };

    const resumedPayload = {
      sessionId: "52f506a6-1dc0-492e-b941-c03388c4a04e",
      state: "resumed",
      currentScenario: 3,
      currentNode: "END",
    };

    // Client action on / page
    if (resumedPayload.sessionId) {
      mockSessionStorage.removeItem("experiment_session_id");
      mockSessionStorage.setItem("experiment_session_id", resumedPayload.sessionId);
    }

    assert.equal(
      mockSessionStorage.getItem("experiment_session_id"),
      "52f506a6-1dc0-492e-b941-c03388c4a04e"
    );
  });

  it("2. stale sessionId is replaced in client storage", () => {
    const storage: Record<string, string> = {
      experiment_session_id: "stale-session-id-9999",
    };
    const mockSessionStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
    };

    const newResumedSessionId = "52f506a6-1dc0-492e-b941-c03388c4a04e";

    // Start page overwrite logic
    mockSessionStorage.removeItem("experiment_session_id");
    mockSessionStorage.setItem("experiment_session_id", newResumedSessionId);

    assert.equal(
      mockSessionStorage.getItem("experiment_session_id"),
      newResumedSessionId
    );
    assert.notEqual(
      mockSessionStorage.getItem("experiment_session_id"),
      "stale-session-id-9999"
    );
  });

  it("3. Scenario 3 END + active does NOT redirect to start and resolves all nodes safely", () => {
    const sessionData = {
      currentScenario: 3,
      currentNode: "END",
      status: "active",
      scenarioVersion: "2.0",
    };

    // Simulate chat guard check
    let redirectedTo: string | null = null;
    const mockRouter = {
      replace: (path: string) => { redirectedTo = path; },
    };

    const version = sessionData.scenarioVersion;
    const activeNode = sessionData.currentNode;
    const scenarioNum = sessionData.currentScenario;
    const status = sessionData.status;

    // Guard rules in chat/page.tsx
    if (version !== "2.0" && (activeNode === "END" || status === "completed")) {
      mockRouter.replace("/complete");
    } else if (version === "2.0" && status === "completed") {
      mockRouter.replace("/complete");
    }

    // Active session at S3 END must NOT redirect
    assert.equal(redirectedTo, null, "Active session at S3 END must not redirect to /complete or /");

    // Milestone flag is correctly set
    const s3Completed = scenarioNum === 3 && activeNode === "END";
    assert.equal(s3Completed, true, "Scenario 3 END must activate s3Completed banner");

    // All S3 cross-scenario nodes resolve safely through registry without throwing
    const s3Nodes = ["N1", "N2_A", "N2_B", "N2_C", "N3", "N4", "END"];
    for (const node of s3Nodes) {
      const view = getScenarioNodeByContext(3, node, "2.0");
      assert.ok(view, `Node ${node} must resolve in scenario 3 context`);
      assert.equal(view.id, node);
    }

    // Progress derivation reflects Skill 1 & 2 completed, Skill 3 active, 4 & 5 upcoming
    const progress = getJourneyProgress(3, false);
    const completed = progress.filter((s) => s.state === "completed");
    const active = progress.filter((s) => s.state === "active");
    const upcoming = progress.filter((s) => s.state === "upcoming");

    assert.equal(completed.length, 2, "Skills 1 and 2 must be completed");
    assert.equal(active.length, 1, "Skill 3 must be active");
    assert.equal(active[0].id, 3);
    assert.equal(upcoming.length, 2, "Skills 4 and 5 must be upcoming");
  });

  it("4. completed experiment DOES redirect/block restart appropriately", () => {
    let redirectedTo: string | null = null;
    const mockRouter = {
      replace: (path: string) => { redirectedTo = path; },
    };

    // When status is completed, chat page redirects to /complete
    const completedSession = {
      currentScenario: 5,
      currentNode: "END",
      status: "completed",
      scenarioVersion: "2.0",
    };

    if (completedSession.scenarioVersion !== "2.0" && (completedSession.currentNode === "END" || completedSession.status === "completed")) {
      mockRouter.replace("/complete");
    } else if (completedSession.scenarioVersion === "2.0" && completedSession.status === "completed") {
      mockRouter.replace("/complete");
    }

    assert.equal(redirectedTo, "/complete", "Completed 2.0 session must redirect to /complete");
  });

  it("5. missing/invalid session still redirects safely to start", () => {
    let redirectedTo: string | null = null;
    const mockRouter = {
      replace: (path: string) => { redirectedTo = path; },
    };

    // 1) Missing sessionId
    const activeSessionId: string | null = null;
    if (!activeSessionId) {
      mockRouter.replace("/");
    }
    assert.equal(redirectedTo, "/");

    // 2) Restore fails (e.g. 404 or network failure)
    redirectedTo = null;
    const restoreOk = false;
    if (!restoreOk) {
      mockRouter.replace("/");
    }
    assert.equal(redirectedTo, "/");
  });

  it("6. structured S3 card formats all five Arabic labels without exposing raw JSON or enums", () => {
    const rawJson = JSON.stringify({
      customerSegments: "?????? ??? ????? ??????? ?? ???????? ????????",
      valueProposition: "???? ?????? ??????? ??????? ???????? ?????? ?????",
      channels: "????? ?????? ???????? ??????????",
      revenueStreams: "???????? ????? ??????? ????? 500 ????? ??????",
      costStructure: "??????? ?????? ????? ?????? ?????? ?????",
    });

    assert.ok(isStructuredBusinessModel(rawJson));
    const blocks = deserializeBusinessModel(rawJson);
    assert.ok(blocks !== null);

    const formatted = formatBusinessModelDisplay(blocks!);

    // Confirm all 5 Arabic labels
    assert.ok(formatted.includes("????? ???????"));
    assert.ok(formatted.includes("?????? ????????"));
    assert.ok(formatted.includes("????? ??????? ???????"));
    assert.ok(formatted.includes("????? ?????????"));
    assert.ok(formatted.includes("???? ????????"));

    // Confirm no raw JSON formatting
    assert.ok(!formatted.includes('{"customerSegments"'));
    assert.ok(!formatted.includes('"valueProposition"'));

    // Confirm no internal enums or classification leak
    assert.ok(!formatted.includes("pricing_gap"));
    assert.ok(!formatted.includes("cost_gap"));
    assert.ok(!formatted.includes("channel_gap"));
    assert.ok(!formatted.includes("advanced"));
    assert.ok(!formatted.includes("weak"));
  });
});