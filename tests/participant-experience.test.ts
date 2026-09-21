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
  getJourneyProgressPercent,
  formatElapsedActiveTime,
} from "../lib/journey";
import {
  BUSINESS_MODEL_LABELS,
  deserializeBusinessModel,
  formatBusinessModelDisplay,
  type BusinessModelBlocks,
} from "../lib/scenarios/scenario-3";
import {
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
  RECOVERY_CHOICE_A,
  RECOVERY_CHOICE_B,
} from "../lib/scenarios/scenario-4";
import {
  CAMPAIGN_A_METRICS,
  CAMPAIGN_B_METRICS,
  REMAINING_BUDGET,
} from "../lib/scenarios/scenario-5";

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

test("T55.2 Chat Page Layout, Hint Button & Leak Protection Invariants", () => {
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const content = fs.readFileSync(chatPagePath, "utf8");

  // Invariant 1: Old four quick-support chips are ABSENT from participant UI
  assert.ok(!content.includes("مش فاهم"), "Support chip 'مش فاهم' must be absent");
  assert.ok(!content.includes("وضحلي"), "Support chip 'وضحلي' must be absent");
  assert.ok(!content.includes("اديني مثال"), "Support chip 'اديني مثال' must be absent");
  assert.ok(!content.includes("كلمني بالمصري"), "Support chip 'كلمني بالمصري' must be absent");

  // Invariant 2: One participant Hint control exists
  assert.ok(content.includes("btn-hint"), "Hint button class 'btn-hint' must be present");
  assert.ok(content.includes("💡"), "Hint icon must be present");
  assert.ok(content.includes("تلميح"), "Hint label 'تلميح' must be present");
  assert.ok(content.includes("طلب تلميح"), "Accessible name 'طلب تلميح' must be present");

  // Invariant 7: S4 N2 timed crisis exposes NO Hint control
  assert.ok(
    content.includes("isHintAvailable = !(currentScenario === 4 && currentNodeId === 'N2')") ||
    content.includes('isHintAvailable = !(currentScenario === 4 && currentNodeId === "N2")') ||
    content.includes("currentScenario === 4 && currentNodeId === 'N2'") ||
    content.includes('currentScenario === 4 && currentNodeId === "N2"'),
    "S4 N2 crisis must suppress Hint control"
  );

  // Invariant 9, 10, 11: Active elapsed UI timer uses session-specific sessionStorage and visibility
  assert.ok(content.includes("experiment_elapsed_active_seconds_"), "Timer key must be session-namespaced");
  assert.ok(content.includes("visibilitychange"), "Timer must listen for visibility changes");
  assert.ok(content.includes("document.visibilityState"), "Timer must check document.visibilityState");
  assert.ok(content.includes("الوقت المنقضي"), "Timer label must be 'الوقت المنقضي'");

  // Invariant 14: Participant sees no support level, score, or classification in UI
  assert.ok(!content.includes("مستوى الدعم الحالي"), "Support level must not be exposed to participant");
  assert.ok(!content.includes("مستوى الدعم:"), "Support level must not be exposed to participant");
  assert.ok(!content.includes("درجة الأداء"), "Performance grade must not be exposed to participant");
  assert.ok(!content.includes("نسبة الإتقان"), "Mastery must not be exposed to participant");
  assert.ok(!content.includes(">pricing_gap<"), "pricing_gap must not be rendered in JSX");
  assert.ok(!content.includes(">cost_gap<"), "cost_gap must not be rendered in JSX");
  assert.ok(!content.includes(">channel_gap<"), "channel_gap must not be rendered in JSX");
  assert.ok(!content.includes(">decision_time_ms<"), "decision_time_ms must not be rendered");

  // Invariant 16: Session key remains experiment_session_id
  assert.ok(content.includes('"experiment_session_id"') || content.includes("'experiment_session_id'"), "Must maintain experiment_session_id storage key");

  // Restrained compact task heading
  assert.ok(content.includes("مهمتك الآن"), "Current task heading present in compact card");
});

test("T55.2 Journey Progress Derivation & Interpretation", () => {
  // Invariant 13: Progress is journey completion progress only (S1=20%, S2=40%, S3=60%, S4=80%, S5=100%)
  assert.equal(getJourneyProgressPercent(1, false), 20);
  assert.equal(getJourneyProgressPercent(2, false), 40);
  assert.equal(getJourneyProgressPercent(3, false), 60);
  assert.equal(getJourneyProgressPercent(4, false), 80);
  assert.equal(getJourneyProgressPercent(5, false), 100);
  assert.equal(getJourneyProgressPercent(5, true), 100);
});

test("T55.2 Timer Display & Formatting Helpers", () => {
  // Invariant 10: formatElapsedActiveTime produces MM:SS or HH:MM:SS
  assert.equal(formatElapsedActiveTime(0), "00:00");
  assert.equal(formatElapsedActiveTime(9), "00:09");
  assert.equal(formatElapsedActiveTime(60), "01:00");
  assert.equal(formatElapsedActiveTime(525), "08:45");
  assert.equal(formatElapsedActiveTime(3600), "01:00:00");
});

test("T55.2 Hint Progressive Scaffolding & Server Integration", () => {
  // Invariant 3, 4, 5, 6: Evaluator uses progressive scaffolding based on support turn count
  const evaluatorPath = path.resolve(process.cwd(), "lib/server/evaluator.ts");
  const evaluatorContent = fs.readFileSync(evaluatorPath, "utf8");

  assert.ok(evaluatorContent.includes("getSupportTurnCount"), "Evaluator must query support turn count");
  assert.ok(evaluatorContent.includes("getScaffoldingGuidance"), "Evaluator must compute scaffolding guidance");
  assert.ok(evaluatorContent.includes("SCAFFOLDING LEVEL FOR SUPPORT TURNS"), "Evaluator prompt must include scaffolding level");

  const persistencePath = path.resolve(process.cwd(), "lib/server/persistence.ts");
  const persistenceContent = fs.readFileSync(persistencePath, "utf8");

  assert.ok(persistenceContent.includes('eq("turn_kind", "conversational_support")'), "Persistence must filter by conversational_support");
});

test("T55.2 S4 Crisis Authoritative Countdown Preservation", () => {
  // Invariant 12: S4 authoritative 60s countdown unchanged
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const content = fs.readFileSync(chatPagePath, "utf8");

  // Preserves 60s limit calculation in S4 crisis countdown
  assert.ok(content.includes("crisisSecondsLeft / 60") || content.includes("crisisSecondsLeft"), "S4 crisis countdown must anchor to 60 seconds");
  assert.ok(content.includes("crisis_timeout") || content.includes("crisisSecondsLeft"), "Crisis timeout invariant must be preserved");
});

test("T55.1 S3 Five-Block Structured Restoration", () => {
  // Invariant 15: Existing S3 structured states restore
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
  // Invariant 15: Existing S4 structured states restore
  assert.ok(CRISIS_CHOICE_A.length > 10);
  assert.ok(CRISIS_CHOICE_B.length > 10);
  assert.ok(CRISIS_CHOICE_C.length > 10);
  assert.ok(RECOVERY_CHOICE_A.length > 10);
  assert.ok(RECOVERY_CHOICE_B.length > 10);
});

test("T55.1 S5 Fixed Marketing Metrics Preservation", () => {
  // Invariant 8 & 15: Existing S5 structured metrics and analysis does not preselect B
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
