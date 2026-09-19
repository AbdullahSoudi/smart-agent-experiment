import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SCENARIO_2_CANONICAL_OPENING,
  SCENARIO_2_NODES,
} from "../lib/scenarios/scenario-2";
import {
  SCENARIO_3_CANONICAL_OPENING,
  BUSINESS_MODEL_LABELS,
  N2_A_PROMPT,
  N2_B_PROMPT,
  N2_C_PROMPT,
  N4_PROMPT,
} from "../lib/scenarios/scenario-3";

test("Canonical Text Protection: Scenario 2 Researcher Wording", async (t) => {
  const spec2 = fs.readFileSync("research/scenarios/scenario-2.md", "utf8");

  await t.test("Scenario 2 Opening matches spec verbatim", () => {
    assert.ok(
      spec2.includes(SCENARIO_2_CANONICAL_OPENING),
      "Scenario 2 canonical opening must exist verbatim in scenario-2.md"
    );
  });

  await t.test("Scenario 2 N2 Marketing Challenge matches spec verbatim", () => {
    assert.ok(
      spec2.includes(SCENARIO_2_NODES.N2.prompt),
      "Scenario 2 N2 prompt must exist verbatim in scenario-2.md"
    );
  });

  await t.test("Scenario 2 N3 Competition Challenge matches spec verbatim", () => {
    assert.ok(
      spec2.includes(SCENARIO_2_NODES.N3.prompt),
      "Scenario 2 N3 prompt must exist verbatim in scenario-2.md"
    );
  });

  await t.test("Scenario 2 N4 Rebuilding Idea matches spec verbatim", () => {
    assert.ok(
      spec2.includes(SCENARIO_2_NODES.N4.prompt),
      "Scenario 2 N4 prompt must exist verbatim in scenario-2.md"
    );
  });

  await t.test("Scenario 2 N5 Scalability Challenge matches spec verbatim", () => {
    assert.ok(
      spec2.includes(SCENARIO_2_NODES.N5.prompt),
      "Scenario 2 N5 prompt must exist verbatim in scenario-2.md"
    );
  });
});

test("Canonical Text Protection: Scenario 3 Researcher Wording", async (t) => {
  const spec3 = fs.readFileSync("research/scenarios/scenario-3.md", "utf8");

  await t.test("Scenario 3 Opening matches spec verbatim", () => {
    assert.ok(
      spec3.includes(SCENARIO_3_CANONICAL_OPENING),
      "Scenario 3 canonical opening must exist verbatim in scenario-3.md"
    );
  });

  await t.test("Five Business Model Labels match spec verbatim", () => {
    assert.ok(
      spec3.includes("شرائح العملاء (من هم عملاؤك؟)"),
      "customerSegments label must exist in scenario-3.md"
    );
    assert.ok(
      spec3.includes("القيمة المقدمة (ما الذي يميز خدمتك؟)"),
      "valueProposition label must exist in scenario-3.md"
    );
    assert.ok(
      spec3.includes("القنوات (كيف ستصل إليهم؟)"),
      "channels label must exist in scenario-3.md"
    );
    assert.ok(
      spec3.includes("مصادر الإيرادات (كيف ستربح؟)"),
      "revenueStreams label must exist in scenario-3.md"
    );
    assert.ok(
      spec3.includes("هيكل التكاليف (ما هي نفقاتك الأساسية؟)"),
      "costStructure label must exist in scenario-3.md"
    );
  });

  await t.test("Key Gap Intervention N2-A matches spec verbatim", () => {
    assert.ok(
      spec3.includes(N2_A_PROMPT),
      "N2-A pricing gap prompt must exist verbatim in scenario-3.md"
    );
  });

  await t.test("Key Gap Intervention N2-B matches spec verbatim", () => {
    assert.ok(
      spec3.includes(N2_B_PROMPT),
      "N2-B cost gap prompt must exist verbatim in scenario-3.md"
    );
  });

  await t.test("Key Gap Intervention N2-C matches spec verbatim", () => {
    assert.ok(
      spec3.includes(N2_C_PROMPT),
      "N2-C channel gap prompt must exist verbatim in scenario-3.md"
    );
  });

  await t.test("Approved Model N4 matches spec verbatim", () => {
    assert.ok(
      spec3.includes(N4_PROMPT),
      "N4 approved model prompt must exist verbatim in scenario-3.md"
    );
  });
});
import {
  SCENARIO_4_CALM_OPENING,
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
  N3_A_CONSEQUENCE,
  N3_B_CONSEQUENCE,
  N3_C_CONSEQUENCE,
  RECOVERY_PROMPT,
  RECOVERY_CHOICE_A,
  RECOVERY_CHOICE_B,
} from "../lib/scenarios/scenario-4";
import {
  SCENARIO_5_CANONICAL_OPENING,
  N2_DASHBOARD_PROMPT,
  N3_A_FEEDBACK,
  N3_B_FEEDBACK,
  N3_C_FEEDBACK,
  N4_BUDGET_PROMPT,
  S5_END_TEXT,
} from "../lib/scenarios/scenario-5";

test("Canonical Text Protection: Scenario 4 Researcher Wording", async (t) => {
  const spec4 = fs.readFileSync("research/scenarios/scenario-4.md", "utf8");

  await t.test("Scenario 4 Calm Opening matches spec verbatim", () => {
    assert.ok(
      spec4.includes(SCENARIO_4_CALM_OPENING),
      "Scenario 4 calm opening must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Crisis Choice A matches spec verbatim", () => {
    assert.ok(
      spec4.includes(CRISIS_CHOICE_A),
      "Crisis choice A must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Crisis Choice B matches spec verbatim", () => {
    assert.ok(
      spec4.includes(CRISIS_CHOICE_B),
      "Crisis choice B must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Crisis Choice C matches spec verbatim", () => {
    assert.ok(
      spec4.includes(CRISIS_CHOICE_C),
      "Crisis choice C must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Consequence N3-A matches spec verbatim", () => {
    assert.ok(
      spec4.includes(N3_A_CONSEQUENCE),
      "Consequence N3-A must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Consequence N3-B matches spec verbatim", () => {
    assert.ok(
      spec4.includes(N3_B_CONSEQUENCE),
      "Consequence N3-B must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Consequence N3-C matches spec verbatim", () => {
    assert.ok(
      spec4.includes(N3_C_CONSEQUENCE),
      "Consequence N3-C must exist verbatim in scenario-4.md"
    );
  });

  await t.test("Recovery prompt and choices match spec verbatim", () => {
    assert.ok(
      spec4.includes(RECOVERY_PROMPT),
      "Recovery prompt must exist verbatim in scenario-4.md"
    );
    assert.ok(
      spec4.includes(RECOVERY_CHOICE_A),
      "Recovery choice A must exist verbatim in scenario-4.md"
    );
    assert.ok(
      spec4.includes(RECOVERY_CHOICE_B),
      "Recovery choice B must exist verbatim in scenario-4.md"
    );
  });
});

test("Canonical Text Protection: Scenario 5 Researcher Wording", async (t) => {
  const spec5 = fs.readFileSync("research/scenarios/scenario-5.md", "utf8");

  await t.test("Scenario 5 Opening matches spec verbatim", () => {
    assert.ok(
      spec5.includes(SCENARIO_5_CANONICAL_OPENING),
      "Scenario 5 opening must exist verbatim in scenario-5.md"
    );
  });

  await t.test("Fixed campaign results dashboard prompt matches spec verbatim", () => {
    assert.ok(
      spec5.includes(N2_DASHBOARD_PROMPT),
      "N2 dashboard prompt must exist verbatim in scenario-5.md"
    );
  });

  await t.test("CPA vanity metric correction N3-A matches spec verbatim", () => {
    assert.ok(
      spec5.includes(N3_A_FEEDBACK),
      "N3-A CPA correction must exist verbatim in scenario-5.md"
    );
  });

  await t.test("Advanced feedback N3-B matches spec verbatim", () => {
    assert.ok(
      spec5.includes(N3_B_FEEDBACK),
      "N3-B advanced feedback must exist verbatim in scenario-5.md"
    );
  });

  await t.test("Fallback calculation hint N3-C matches spec verbatim", () => {
    assert.ok(
      spec5.includes(N3_C_FEEDBACK),
      "N3-C fallback hint must exist verbatim in scenario-5.md"
    );
  });

  await t.test("N4 budget allocation prompt matches spec verbatim", () => {
    assert.ok(
      spec5.includes(N4_BUDGET_PROMPT),
      "N4 budget prompt must exist verbatim in scenario-5.md"
    );
  });

  await t.test("Scenario 5 final analytical report END text matches spec verbatim", () => {
    assert.ok(
      spec5.includes(S5_END_TEXT),
      "S5 END report text must exist verbatim in scenario-5.md"
    );
  });
});