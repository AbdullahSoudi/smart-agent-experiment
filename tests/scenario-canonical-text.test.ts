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