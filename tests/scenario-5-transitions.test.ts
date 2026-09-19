import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextNodeS5Decision,
  serializeHeadlines,
  deserializeHeadlines,
  formatHeadlinesDisplay,
  serializeCampaignDecision,
  deserializeCampaignDecision,
  formatCampaignDecisionDisplay,
  CAMPAIGN_A_METRICS,
  CAMPAIGN_B_METRICS,
  REMAINING_BUDGET,
  SCENARIO_5_START_NODE_ID,
  type CampaignDecisionChoice,
} from "../lib/scenarios/scenario-5";
import { getNextScenarioId, isLastScenario } from "../lib/journey";

test("Scenario 5 Deterministic Transitions & A/B Marketing Mechanics", async (t) => {
  await t.test("S4 END advances to S5 start node", () => {
    assert.equal(getNextScenarioId(4), 5);
    assert.equal(SCENARIO_5_START_NODE_ID, "N1");
    assert.equal(isLastScenario(5), true);
  });

  await t.test("Two headline fields are strictly validated and serialized", () => {
    const valid = serializeHeadlines({
      headlineA: "خصم 50% لأول 100 مشترك",
      headlineB: "الخدمة الأكثر موثوقية وجودة",
    });
    assert.equal(
      valid,
      '{"headlineA":"خصم 50% لأول 100 مشترك","headlineB":"الخدمة الأكثر موثوقية وجودة"}'
    );

    const parsed = deserializeHeadlines(valid);
    assert.deepEqual(parsed, {
      headlineA: "خصم 50% لأول 100 مشترك",
      headlineB: "الخدمة الأكثر موثوقية وجودة",
    });

    // Empty or whitespace-only headline is rejected
    assert.equal(deserializeHeadlines('{"headlineA":"","headlineB":"جودة"}'), null);
    assert.equal(deserializeHeadlines('{"headlineA":"سعر","headlineB":"   "}'), null);
    assert.equal(deserializeHeadlines('{}'), null);
    assert.equal(deserializeHeadlines('invalid json'), null);
  });

  await t.test("Headlines display formatting hides raw JSON from participant", () => {
    const display = formatHeadlinesDisplay({
      headlineA: "خصم خاص",
      headlineB: "جودة ممتازة",
    });
    assert.ok(display.includes("خصم خاص"));
    assert.ok(display.includes("جودة ممتازة"));
    assert.equal(display.includes("{"), false);
  });

  await t.test("Fixed Campaign A metrics are canonical: 1000 visits / 5 buyers / $20 CPA", () => {
    assert.equal(CAMPAIGN_A_METRICS.spend, 100);
    assert.equal(CAMPAIGN_A_METRICS.visits, 1000);
    assert.equal(CAMPAIGN_A_METRICS.buyers, 5);
    assert.equal(CAMPAIGN_A_METRICS.cpa, 20); // 100 / 5
    assert.equal(CAMPAIGN_A_METRICS.spend / CAMPAIGN_A_METRICS.buyers, 20);
  });

  await t.test("Fixed Campaign B metrics are canonical: 200 visits / 20 buyers / $5 CPA", () => {
    assert.equal(CAMPAIGN_B_METRICS.spend, 100);
    assert.equal(CAMPAIGN_B_METRICS.visits, 200);
    assert.equal(CAMPAIGN_B_METRICS.buyers, 20);
    assert.equal(CAMPAIGN_B_METRICS.cpa, 5); // 100 / 20
    assert.equal(CAMPAIGN_B_METRICS.spend / CAMPAIGN_B_METRICS.buyers, 5);
  });

  await t.test("Remaining budget is exactly $800 ($1000 total - $100 A - $100 B)", () => {
    const totalBudget = 1000;
    const remaining = totalBudget - CAMPAIGN_A_METRICS.spend - CAMPAIGN_B_METRICS.spend;
    assert.equal(remaining, 800);
    assert.equal(REMAINING_BUDGET, 800);
  });

  await t.test("Correct B decision path (focus on actual buyers) routes to N3_B", () => {
    assert.equal(getNextNodeS5Decision("choose_b"), "N3_B");
  });

  await t.test("Vanity-metric A path (deceived by 1000 visits) routes to N3_A correction", () => {
    assert.equal(getNextNodeS5Decision("choose_a"), "N3_A");
  });

  await t.test("Unable / fallback path routes to N3_C calculation hint", () => {
    assert.equal(getNextNodeS5Decision("unable"), "N3_C");
  });

  await t.test("Campaign decision serialization and display formatting", () => {
    const serialized = serializeCampaignDecision({
      selectedChoice: "choose_b",
      reasoning: "لأن تكلفة الاستحواذ 5$ فقط مقارنة بـ 20$",
      confirmedChange: false,
    });
    assert.ok(serialized.includes('"selectedChoice":"choose_b"'));

    const parsed = deserializeCampaignDecision(serialized);
    assert.equal(parsed?.selectedChoice, "choose_b");
    assert.equal(parsed?.reasoning, "لأن تكلفة الاستحواذ 5$ فقط مقارنة بـ 20$");

    const display = formatCampaignDecisionDisplay(parsed!);
    assert.ok(display.includes("للحملة (B)"));
    assert.ok(display.includes("800$"));
    assert.equal(display.includes("{"), false);
  });

  await t.test("Overall completion invariant: S5 END is the only terminal node in sequential journey", () => {
    // S1, S2, S3, S4 are not last
    assert.equal(isLastScenario(1), false);
    assert.equal(isLastScenario(2), false);
    assert.equal(isLastScenario(3), false);
    assert.equal(isLastScenario(4), false);

    // Only S5 is the final terminal scenario
    assert.equal(isLastScenario(5), true);
    assert.equal(getNextScenarioId(5), null);
  });
});