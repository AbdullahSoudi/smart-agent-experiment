import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextNodeS3Audit,
  getNextNodeS3Reconciliation,
  serializeBusinessModel,
  deserializeBusinessModel,
  isStructuredBusinessModel,
  type BusinessModelBlocks,
} from "../lib/scenarios/scenario-3";

test("Scenario 3 Deterministic Transitions & Data Integrity", async (t) => {
  await t.test("Coherent model routes from N1 directly to N4", () => {
    assert.equal(getNextNodeS3Audit("coherent"), "N4");
  });

  await t.test("Pricing / purchasing-power gap routes from N1 to N2_A", () => {
    assert.equal(getNextNodeS3Audit("pricing_gap"), "N2_A");
  });

  await t.test("Value / cost-structure gap routes from N1 to N2_B", () => {
    assert.equal(getNextNodeS3Audit("cost_gap"), "N2_B");
  });

  await t.test("Channel / customer-segment gap routes from N1 to N2_C", () => {
    assert.equal(getNextNodeS3Audit("channel_gap"), "N2_C");
  });

  await t.test("Reconciliation: Resolved model advances to N4 approval", () => {
    assert.equal(getNextNodeS3Reconciliation("resolved"), "N4");
  });

  await t.test("Reconciliation: Unresolved model advances to N4 fallback guidance per spec", () => {
    assert.equal(getNextNodeS3Reconciliation("unresolved"), "N4");
  });

  await t.test("Structured serialization preserves all 5 fields intact", () => {
    const blocks: BusinessModelBlocks = {
      customerSegments: "طلاب الجامعات",
      valueProposition: "منصة تبادل كتب مستعملة",
      channels: "تطبيق ويب ومجموعات تواصل",
      revenueStreams: "عمولة 5% على الصفقات",
      costStructure: "استضافة سحابية وبوابة دفع",
    };

    const serialized = serializeBusinessModel(blocks);
    assert.ok(isStructuredBusinessModel(serialized));

    const deserialized = deserializeBusinessModel(serialized);
    assert.deepEqual(deserialized, blocks);
  });

  await t.test("Non-structured text returns false and null safely", () => {
    assert.equal(isStructuredBusinessModel("مجرد نص عادي"), false);
    assert.equal(deserializeBusinessModel("مجرد نص عادي"), null);
    assert.equal(isStructuredBusinessModel("{ broken json"), false);
  });
});