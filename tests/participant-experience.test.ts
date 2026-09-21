import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SCENARIOS_JOURNEY,
  SHORT_SKILL_TITLES,
  getJourneyProgress,
  getShortSkillTitle,
  getNextScenarioId,
  isLastScenario,
} from "@/lib/journey";
import {
  BUSINESS_MODEL_LABELS,
  deserializeBusinessModel,
  formatBusinessModelDisplay,
  type BusinessModelBlocks,
} from "@/lib/scenarios/scenario-3";
import {
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
  RECOVERY_CHOICE_A,
  RECOVERY_CHOICE_B,
} from "@/lib/scenarios/scenario-4";
import {
  CAMPAIGN_A_METRICS,
  CAMPAIGN_B_METRICS,
  REMAINING_BUDGET,
} from "@/lib/scenarios/scenario-5";

test("T55.1 Journey Header & Short Titles Invariants", () => {
  assert.equal(SCENARIOS_JOURNEY.length, 5);
  for (const s of SCENARIOS_JOURNEY) {
    assert.equal(s.shortTitle, SHORT_SKILL_TITLES[s.id]);
    assert.ok(s.shortTitle.length > 0);
    assert.equal(getShortSkillTitle(s.id), s.shortTitle);
  }

  // Progress derivation populates shortTitle
  const p3 = getJourneyProgress(3);
  assert.equal(p3.length, 5);
  assert.equal(p3[0].state, "completed");
  assert.equal(p3[0].shortTitle, "الفرص");
  assert.equal(p3[1].state, "completed");
  assert.equal(p3[1].shortTitle, "الأفكار");
  assert.equal(p3[2].state, "active");
  assert.equal(p3[2].shortTitle, "نموذج العمل");
  assert.equal(p3[3].state, "upcoming");
  assert.equal(p3[3].shortTitle, "المخاطر");
  assert.equal(p3[4].state, "upcoming");
  assert.equal(p3[4].shortTitle, "التسويق");
});

test("T55.1 Final Completion Page Invariants (/complete)", () => {
  const completePagePath = path.resolve(process.cwd(), "app/complete/page.tsx");
  const content = fs.readFileSync(completePagePath, "utf8");

  // Must contain main title and gratitude
  assert.ok(content.includes("أتممت الرحلة كاملة"), "Must show journey completion title");
  assert.ok(content.includes("شكرًا لمشاركتك في التجربة"), "Must show thank you message");

  // Must render all 5 scenario titles
  assert.ok(content.includes("SCENARIOS_JOURNEY"), "Must iterate over SCENARIOS_JOURNEY");

  // Forbidden internal researcher terms
  const forbiddenTerms = [
    "classification",
    "score",
    "weak",
    "advanced",
    "mastery",
    "decision_time_ms",
    "pricing_gap",
    "cost_gap",
    "channel_gap",
    "accuracy",
  ];
  for (const term of forbiddenTerms) {
    assert.ok(
      !content.toLowerCase().includes(term),
      `Participant completion page must never contain '${term}'`
    );
  }
});

test("T55.1 Chat Page Leak Protection & Student Safety", () => {
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const content = fs.readFileSync(chatPagePath, "utf8");

  // Check that raw internal gap names are not rendered to participant
  assert.ok(!content.includes(">pricing_gap<"), "pricing_gap must not be rendered in JSX");
  assert.ok(!content.includes(">cost_gap<"), "cost_gap must not be rendered in JSX");
  assert.ok(!content.includes(">channel_gap<"), "channel_gap must not be rendered in JSX");

  // Check that decision_time_ms is not rendered to participant
  assert.ok(!content.includes(">decision_time_ms<"), "decision_time_ms must not be rendered");

  // Quick support chips are present
  assert.ok(content.includes("مش فاهم"), "Support chip 'مش فاهم' present");
  assert.ok(content.includes("وضحلي"), "Support chip 'وضحلي' present");
  assert.ok(content.includes("اديني مثال"), "Support chip 'اديني مثال' present");
  assert.ok(content.includes("كلمني بالمصري"), "Support chip 'كلمني بالمصري' present");

  // "مهمتك الآن" card present
  assert.ok(content.includes("مهمتك الآن"), "Current task card present");
});

test("T55.1 S3 Five-Block Structured Restoration", () => {
  const testBlocks: BusinessModelBlocks = {
    customerSegments: "طلاب الجامعات",
    valueProposition: "تبادل الكتب المستعملة",
    channels: "تطبيق ويب ومجموعات طلابية",
    revenueStreams: "عمولة رمزية 5%",
    costStructure: "استضافة ودفع إلكتروني",
  };

  const serialized = JSON.stringify(testBlocks);
  const restored = deserializeBusinessModel(serialized);
  assert.deepEqual(restored, testBlocks);

  const display = formatBusinessModelDisplay(restored!);
  assert.ok(display.includes("شرائح العملاء"));
  assert.ok(display.includes("القيمة المقترحة"));
  assert.ok(display.includes("قنوات"));
  assert.ok(display.includes("مصادر الإيرادات"));
  assert.ok(display.includes("هيكل التكاليف"));
  assert.ok(!display.includes("{"), "Display must not contain raw JSON");
});

test("T55.1 S4 Crisis Choices & Recovery Canonical Preservation", () => {
  assert.ok(CRISIS_CHOICE_A.length > 10);
  assert.ok(CRISIS_CHOICE_B.length > 10);
  assert.ok(CRISIS_CHOICE_C.length > 10);
  assert.ok(RECOVERY_CHOICE_A.length > 10);
  assert.ok(RECOVERY_CHOICE_B.length > 10);
});

test("T55.1 S5 Fixed Marketing Metrics Preservation", () => {
  assert.equal(CAMPAIGN_A_METRICS.visits, 1000);
  assert.equal(CAMPAIGN_A_METRICS.buyers, 5);
  assert.equal(CAMPAIGN_A_METRICS.cpa, 20);

  assert.equal(CAMPAIGN_B_METRICS.visits, 200);
  assert.equal(CAMPAIGN_B_METRICS.buyers, 20);
  assert.equal(CAMPAIGN_B_METRICS.cpa, 5);

  assert.equal(REMAINING_BUDGET, 800);
});

test("T55.1 Scenario Completion Transition Order", () => {
  assert.equal(getNextScenarioId(1), 2);
  assert.equal(getNextScenarioId(2), 3);
  assert.equal(getNextScenarioId(3), 4);
  assert.equal(getNextScenarioId(4), 5);
  assert.equal(getNextScenarioId(5), null);

  assert.equal(isLastScenario(1), false);
  assert.equal(isLastScenario(4), false);
  assert.equal(isLastScenario(5), true);
});
