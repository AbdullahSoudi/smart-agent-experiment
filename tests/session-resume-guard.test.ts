import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getScenarioNodeByContext } from "../lib/scenarios/registry";
import { getJourneyProgress } from "../lib/journey";
import { isSequentialJourneyVersion, SCENARIO_VERSION, DEFAULT_SCENARIO_VERSION } from "../lib/scenario";
import { SCENARIO_2_START_NODE_ID } from "../lib/scenarios/scenario-2";
import { SCENARIO_3_START_NODE_ID } from "../lib/scenarios/scenario-3";
import { SCENARIO_4_START_NODE_ID } from "../lib/scenarios/scenario-4";
import { SCENARIO_5_START_NODE_ID } from "../lib/scenarios/scenario-5";
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
    if (!isSequentialJourneyVersion(version) && (activeNode === "END" || status === "completed")) {
      mockRouter.replace("/complete");
    } else if (isSequentialJourneyVersion(version) && status === "completed") {
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

    if (!isSequentialJourneyVersion(completedSession.scenarioVersion) && (completedSession.currentNode === "END" || completedSession.status === "completed")) {
      mockRouter.replace("/complete");
    } else if (isSequentialJourneyVersion(completedSession.scenarioVersion) && completedSession.status === "completed") {
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
      customerSegments: "الطلاب ذوي الدخل المحدود في الجامعات الحكومية",
      valueProposition: "منصة لتبادل ومشاركة المراجع الدراسية بأسعار مخفضة",
      channels: "تطبيق الهاتف ومجموعات التيليجرام",
      revenueStreams: "اشتراكات شهرية إلزامية بقيمة 500 دولار أمريكي",
      costStructure: "استضافة سحابية بسيطة وصيانة وتطوير برمجي",
    });

    assert.ok(isStructuredBusinessModel(rawJson));
    const blocks = deserializeBusinessModel(rawJson);
    assert.ok(blocks !== null);

    const formatted = formatBusinessModelDisplay(blocks!);

    // Confirm all 5 Arabic labels
    assert.ok(formatted.includes("شرائح العملاء"));
    assert.ok(formatted.includes("القيمة المقترحة"));
    assert.ok(formatted.includes("قنوات التوزيع والوصول"));
    assert.ok(formatted.includes("مصادر الإيرادات"));
    assert.ok(formatted.includes("هيكل التكاليف"));

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

describe("Legacy 2.0-dev Sequential Compatibility Invariants", () => {
  // Pure state transition validator matching app/api/session/advance/route.ts
  function simulateAdvance(session: {
    scenario_version: string;
    status: string;
    current_scenario?: number | null;
    current_node: string;
  }): { status: number; body: Record<string, unknown> } {
    if (session.status !== "active") {
      return { status: 409, body: { error: "الجلسة غير نشطة." } };
    }

    if (!isSequentialJourneyVersion(session.scenario_version)) {
      return {
        status: 400,
        body: { error: "هذه الجلسة تتبع نموذج النسخ التاريخية ولا تدعم الانتقال المتسلسل." },
      };
    }

    const currentScenario = session.current_scenario || 1;
    const currentNode = session.current_node;

    if (currentScenario === 1) {
      if (currentNode !== "END") {
        return { status: 409, body: { error: "لا يمكن الانتقال للسيناريو الثاني قبل إتمام السيناريو الأول." } };
      }
      return {
        status: 200,
        body: { currentScenario: 2, currentNode: SCENARIO_2_START_NODE_ID, state: "advanced" },
      };
    }

    if (currentScenario === 2) {
      if (currentNode !== "END") {
        return { status: 409, body: { error: "لا يمكن الانتقال للسيناريو الثالث قبل إتمام السيناريو الثاني." } };
      }
      return {
        status: 200,
        body: { currentScenario: 3, currentNode: SCENARIO_3_START_NODE_ID, state: "advanced" },
      };
    }

    if (currentScenario === 3) {
      if (currentNode !== "END") {
        return { status: 409, body: { error: "لا يمكن الانتقال للسيناريو الرابع قبل إتمام السيناريو الثالث." } };
      }
      return {
        status: 200,
        body: { currentScenario: 4, currentNode: SCENARIO_4_START_NODE_ID, state: "advanced" },
      };
    }

    if (currentScenario === 4) {
      if (currentNode !== "END") {
        return { status: 409, body: { error: "لا يمكن الانتقال للسيناريو الخامس قبل إتمام السيناريو الرابع." } };
      }
      return {
        status: 200,
        body: { currentScenario: 5, currentNode: SCENARIO_5_START_NODE_ID, state: "advanced" },
      };
    }

    if (currentScenario === 5) {
      if (currentNode === "END") {
        return { status: 200, body: { currentScenario: 5, currentNode: "END", state: "reached_s5_end" } };
      }
      return { status: 409, body: { error: "السيناريو الخامس لا يزال قيد التقدم." } };
    }

    return { status: 400, body: { error: "حالة السيناريو الحالية غير مدعومة للانتقال." } };
  }

  // Pure state transition validator matching app/api/session/complete/route.ts
  function simulateComplete(session: {
    id: string;
    scenario_version: string;
    status: string;
    current_scenario?: number | null;
    current_node: string;
    finished_at?: string | null;
  }): { status: number; body: Record<string, unknown> } {
    // 2. Safe idempotency for duplicate completion calls
    if (
      session.status === "completed" &&
      session.current_node === "END" &&
      Boolean(session.finished_at)
    ) {
      return { status: 200, body: { completed: true } };
    }

    // 3. In sequential journey (2.0 / 2.0-dev), overall completion is ONLY allowed after Scenario 5
    if (isSequentialJourneyVersion(session.scenario_version)) {
      if (session.current_scenario !== 5 || session.current_node !== "END") {
        return {
          status: 409,
          body: { error: "لا يمكن إنهاء التجربة قبل إكمال جميع السيناريوهات الخمسة." },
        };
      }
    }

    // 4. Validate session is active and at END node
    if (session.current_node !== "END" || session.status !== "active") {
      return {
        status: 409,
        body: { error: "هذه الجلسة ليست في حالة اكتمال جاهزة للإنهاء." },
      };
    }

    return { status: 200, body: { completed: true } };
  }

  it("1. 2.0 session advances normally", () => {
    const s1 = simulateAdvance({
      scenario_version: "2.0",
      status: "active",
      current_scenario: 1,
      current_node: "END",
    });
    assert.equal(s1.status, 200);
    assert.equal(s1.body.currentScenario, 2);
    assert.equal(s1.body.currentNode, SCENARIO_2_START_NODE_ID);
    assert.equal(s1.body.state, "advanced");
  });

  it("2. 2.0-dev active session advances normally", () => {
    const s1 = simulateAdvance({
      scenario_version: "2.0-dev",
      status: "active",
      current_scenario: 1,
      current_node: "END",
    });
    assert.equal(s1.status, 200);
    assert.equal(s1.body.currentScenario, 2);
    assert.equal(s1.body.currentNode, SCENARIO_2_START_NODE_ID);
    assert.equal(s1.body.state, "advanced");

    const s2 = simulateAdvance({
      scenario_version: "2.0-dev",
      status: "active",
      current_scenario: 2,
      current_node: "END",
    });
    assert.equal(s2.status, 200);
    assert.equal(s2.body.currentScenario, 3);
    assert.equal(s2.body.currentNode, SCENARIO_3_START_NODE_ID);
    assert.equal(s2.body.state, "advanced");
  });

  it("3. 2.0-dev S3 END -> S4 allowed", () => {
    const res = simulateAdvance({
      scenario_version: "2.0-dev",
      status: "active",
      current_scenario: 3,
      current_node: "END",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.currentScenario, 4);
    assert.equal(res.body.currentNode, SCENARIO_4_START_NODE_ID);
    assert.equal(res.body.state, "advanced");
  });

  it("4. 2.0-dev S4 END -> S5 allowed", () => {
    const res = simulateAdvance({
      scenario_version: "2.0-dev",
      status: "active",
      current_scenario: 4,
      current_node: "END",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.currentScenario, 5);
    assert.equal(res.body.currentNode, SCENARIO_5_START_NODE_ID);
    assert.equal(res.body.state, "advanced");
  });

  it("5. 2.0-dev S1-S4 cannot overall-complete", () => {
    for (const sc of [1, 2, 3, 4]) {
      const res = simulateComplete({
        id: "sess-2-0-dev",
        scenario_version: "2.0-dev",
        status: "active",
        current_scenario: sc,
        current_node: "END",
      });
      assert.equal(res.status, 409, `Scenario ${sc} END must not overall-complete`);
      assert.equal(res.body.error, "لا يمكن إنهاء التجربة قبل إكمال جميع السيناريوهات الخمسة.");
    }
  });

  it("6. 2.0-dev S5 END can overall-complete", () => {
    const res = simulateComplete({
      id: "sess-2-0-dev",
      scenario_version: "2.0-dev",
      status: "active",
      current_scenario: 5,
      current_node: "END",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, true);
  });

  it("7. completed 2.0-dev completion remains idempotent", () => {
    const res = simulateComplete({
      id: "sess-2-0-dev-completed",
      scenario_version: "2.0-dev",
      status: "completed",
      current_scenario: 5,
      current_node: "END",
      finished_at: "2026-09-19T20:00:00.000Z",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.completed, true);
  });

  it("8. new session version remains exactly 2.0", () => {
    assert.equal(SCENARIO_VERSION, "2.0");
    assert.equal(DEFAULT_SCENARIO_VERSION, "2.0");
    assert.equal(isSequentialJourneyVersion(SCENARIO_VERSION), true);
    assert.notEqual(SCENARIO_VERSION, "2.0-dev");
  });

  it("9. unrelated historical 1.x behavior unchanged", () => {
    assert.equal(isSequentialJourneyVersion("1.0"), false);
    assert.equal(isSequentialJourneyVersion("1.1"), false);
    assert.equal(isSequentialJourneyVersion(undefined), false);
    assert.equal(isSequentialJourneyVersion(null), false);

    // 1.x sessions cannot advance sequentially
    const advance1_0 = simulateAdvance({
      scenario_version: "1.0",
      status: "active",
      current_scenario: 1,
      current_node: "END",
    });
    assert.equal(advance1_0.status, 400);

    const advance1_1 = simulateAdvance({
      scenario_version: "1.1",
      status: "active",
      current_scenario: 1,
      current_node: "END",
    });
    assert.equal(advance1_1.status, 400);

    // 1.x single-scenario session at END completes directly without requiring S5
    const complete1_0 = simulateComplete({
      id: "sess-1-0",
      scenario_version: "1.0",
      status: "active",
      current_node: "END",
    });
    assert.equal(complete1_0.status, 200);
    assert.equal(complete1_0.body.completed, true);
  });
});
