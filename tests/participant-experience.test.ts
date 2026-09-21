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

test("T55.3 Workspace Composition, Journey Rail & Stepper Invariants", () => {
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const content = fs.readFileSync(chatPagePath, "utf8");

  // Invariant 1: Desktop horizontal skill pills are NO LONGER primary journey UI
  assert.ok(!content.includes("journey-steps-chips"), "Horizontal skill pills must be removed from primary UI");
  assert.ok(!content.includes("journey-progress-strip"), "Old horizontal journey strip must be replaced");

  // Invariant 2: Vertical journey stepper renders five skills in side rail
  assert.ok(content.includes("journey-rail"), "Side rail must exist");
  assert.ok(content.includes("journey-stepper-vertical"), "Vertical journey stepper must exist");
  assert.ok(content.includes("journey-step-item"), "Step items must exist in vertical stepper");

  // Invariant 6: Hint remains exactly one control
  assert.ok(content.includes("btn-hint"), "Hint button class 'btn-hint' must be present");
  assert.ok(content.includes("💡"), "Hint icon must be present");
  assert.ok(content.includes("تلميح"), "Hint label 'تلميح' must be present");
  assert.ok(content.includes("طلب تلميح"), "Accessible name 'طلب تلميح' must be present");

  // Invariant 7: Old four quick-support chips are ABSENT from participant UI
  assert.ok(!content.includes("مش فاهم"), "Support chip 'مش فاهم' must be absent");
  assert.ok(!content.includes("وضحلي"), "Support chip 'وضحلي' must be absent");
  assert.ok(!content.includes("اديني مثال"), "Support chip 'اديني مثال' must be absent");
  assert.ok(!content.includes("كلمني بالمصري"), "Support chip 'كلمني بالمصري' must be absent");

  // Invariant 9: Composer contains Hint + input + Send aligned row
  assert.ok(content.includes("composer-row"), "Composer row must exist");
  assert.ok(content.includes("mentor-composer-textarea"), "Composer input must exist");
  assert.ok(content.includes("btn-mentor-send"), "Send button must exist");

  // Invariant 10: S4 timed crisis exposes NO Hint control
  assert.ok(
    content.includes("currentScenario === 4 && currentNodeId === 'N2'") ||
    content.includes('currentScenario === 4 && currentNodeId === "N2"'),
    "S4 N2 crisis must suppress Hint control"
  );

  // Invariant 11: Active elapsed UI timer uses session-specific sessionStorage and visibility
  assert.ok(content.includes("experiment_elapsed_active_seconds_"), "Timer key must be session-namespaced");
  assert.ok(content.includes("visibilitychange"), "Timer must listen for visibility changes");
  assert.ok(content.includes("document.visibilityState"), "Timer must check document.visibilityState");
  assert.ok(content.includes("الوقت المنقضي"), "Timer label must be 'الوقت المنقضي'");

  // Invariant 12: Participant analytics remain hidden
  assert.ok(!content.includes("مستوى الدعم الحالي"), "Support level must not be exposed to participant");
  assert.ok(!content.includes("مستوى الدعم:"), "Support level must not be exposed to participant");
  assert.ok(!content.includes("درجة الأداء"), "Performance grade must not be exposed to participant");
  assert.ok(!content.includes("نسبة الإتقان"), "Mastery must not be exposed to participant");
  assert.ok(!content.includes(">pricing_gap<"), "pricing_gap must not be rendered in JSX");
  assert.ok(!content.includes(">cost_gap<"), "cost_gap must not be rendered in JSX");
  assert.ok(!content.includes(">channel_gap<"), "channel_gap must not be rendered in JSX");
  assert.ok(!content.includes(">decision_time_ms<"), "decision_time_ms must not be rendered");
});

test("T55.3 Current Task Card Has No Dedicated Overflow Scrollbar", () => {
  // Invariant 8: Current task has no dedicated overflow scrollbar class/style
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  // Extract .current-task-compact declaration block
  const match = cssContent.match(/\.current-task-compact\s*\{([^}]+)\}/);
  assert.ok(match, ".current-task-compact rule must exist in globals.css");
  const block = match[1];

  assert.ok(!block.includes("overflow-y: auto"), "Task card must not have overflow-y: auto");
  assert.ok(!block.includes("overflow-y: scroll"), "Task card must not have overflow-y: scroll");
  assert.ok(!block.includes("max-height: 110px"), "Task card must not be restricted by cramped max-height");
});

test("T55.3 Journey Progress Completion Semantics (0% -> 100%)", () => {
  // Invariant 4 & 5: Completed scenarios / 5
  // Before completing S1: 0%
  assert.equal(getJourneyProgressPercent(1, false), 0);
  // After S1 (S2 active): 20%
  assert.equal(getJourneyProgressPercent(2, false), 20);
  // After S2 (S3 active): 40%
  assert.equal(getJourneyProgressPercent(3, false), 40);
  // After S3 (S4 active): 60%
  assert.equal(getJourneyProgressPercent(4, false), 60);
  // After S4 (S5 active): 80% - S5 active does NOT falsely display 100%
  assert.equal(getJourneyProgressPercent(5, false), 80);
  // After completing S5: 100%
  assert.equal(getJourneyProgressPercent(5, true), 100);
});

test("T55.2 Timer Display & Formatting Helpers", () => {
  assert.equal(formatElapsedActiveTime(0), "00:00");
  assert.equal(formatElapsedActiveTime(9), "00:09");
  assert.equal(formatElapsedActiveTime(60), "01:00");
  assert.equal(formatElapsedActiveTime(525), "08:45");
  assert.equal(formatElapsedActiveTime(3600), "01:00:00");
});

test("T55.2 Hint Progressive Scaffolding & Server Integration", () => {
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
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const content = fs.readFileSync(chatPagePath, "utf8");

  assert.ok(content.includes("crisisSecondsLeft / 60") || content.includes("crisisSecondsLeft"), "S4 crisis countdown must anchor to 60 seconds");
  assert.ok(content.includes("crisis_timeout") || content.includes("crisisSecondsLeft"), "Crisis timeout invariant must be preserved");
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
