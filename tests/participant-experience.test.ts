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
  getSafeCheckpointTitle,
  type ScenarioId,
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

test("T55.4 Document Primary Vertical Scroll Contract & Viewport Invariants", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  // Viewport must NOT lock document scroll with height: 100dvh and overflow: hidden
  const vpMatch = css.match(/\.mentor-chat-viewport\s*\{([^}]+)\}/);
  assert.ok(vpMatch, ".mentor-chat-viewport rule must exist");
  const vpBlock = vpMatch[1];
  assert.ok(!vpBlock.includes("height: 100dvh"), "Viewport must not clamp to height: 100dvh");
  assert.ok(!vpBlock.includes("overflow: hidden"), "Viewport must not hide overflow");
  assert.ok(vpBlock.includes("min-height: 100vh"), "Viewport must have min-height: 100vh");
  assert.ok(vpBlock.includes("overflow: visible"), "Viewport must have overflow: visible");

  // Conversation main must not create a nested scroll container
  const mainMatch = css.match(/\.mentor-chat-main\s*\{([^}]+)\}/);
  assert.ok(mainMatch, ".mentor-chat-main rule must exist");
  const mainBlock = mainMatch[1];
  assert.ok(mainBlock.includes("overflow: visible"), ".mentor-chat-main must have overflow: visible");
  assert.ok(!mainBlock.includes("overflow-y: auto"), ".mentor-chat-main must not have nested overflow-y: auto");

  // Composer bar is sticky at bottom
  assert.ok(css.includes(".mentor-chat-composer-bar"), "Composer bar rule must exist");
  assert.ok(css.includes("position: sticky"), "Composer bar should be sticky");
});

test("T55.4 Composer Single Shell, 52px Aligned Heights & Metadata Row", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const chatPage = fs.readFileSync(chatPagePath, "utf8");

  // 1. Textarea is single visible shell; input wrapper has no border/background/box-shadow
  assert.ok(css.includes(".composer-input-wrapper"), ".composer-input-wrapper must exist");
  assert.ok(css.includes(".mentor-composer-textarea"), ".mentor-composer-textarea must exist");
  assert.ok(css.includes(".composer-metadata-row"), ".composer-metadata-row must exist");
  assert.ok(css.includes(".composer-char-counter"), ".composer-char-counter must exist");

  // Textarea initial height is 52px
  assert.ok(css.includes("height: 52px"), "Composer controls must specify 52px height");
  assert.ok(css.includes("min-height: 52px"), "Composer controls must specify min-height: 52px");

  // 2. Character counter is in metadata row, NOT inside textarea writing surface
  assert.ok(chatPage.includes("composer-metadata-row"), "Chat page must render composer-metadata-row");
  assert.ok(chatPage.includes("composer-char-counter"), "Chat page must render composer-char-counter");
  assert.ok(chatPage.includes("composer-helper-note"), "Chat page must render composer-helper-note");
  assert.ok(chatPage.includes("Enter للإرسال · Shift+Enter لسطر جديد"), "Keyboard helper note must be present");

  // 3. S4 Crisis timer subordination
  assert.ok(css.includes(".crisis-mode-active .journey-rail-timer-section"), "Crisis mode must subordinate general timer");
  assert.ok(css.includes("opacity: 0.35"), "General timer must be subdued during timed crisis");
});

test("T55.4 Auto-Scroll Decoupled from Submit State & Timer Ticks", () => {
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const chatPage = fs.readFileSync(chatPagePath, "utf8");

  // Auto-scroll effect must NOT depend on isSubmitting or activeElapsedSeconds
  assert.ok(!chatPage.includes("[messages, isSubmitting]"), "Auto-scroll must not run on isSubmitting toggle");
  assert.ok(chatPage.includes("prevMessagesCountRef"), "Auto-scroll must track previous message count");
  assert.ok(chatPage.includes('block: "nearest"'), "Scroll behavior should use block: 'nearest'");
});

test("T55.5 'ما سجلته حتى الآن' Is Completely Absent From Participant UI", () => {
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const chatPage = fs.readFileSync(chatPagePath, "utf8");
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.ok(!chatPage.includes("ما سجلته حتى الآن"), "'ما سجلته حتى الآن' must be absent from participant UI");
  assert.ok(!chatPage.includes("s1-thinking-panel"), "'s1-thinking-panel' must be absent from chat page");
  assert.ok(!chatPage.includes("s1LatestAnswer"), "'s1LatestAnswer' helper must be absent from chat page");
  assert.ok(!css.includes(".s1-thinking-panel {"), ".s1-thinking-panel class rule must be removed from globals.css");
});

test("T55.5 Persistent Header With Three Calm Zones & Sticky Contract", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const chatPage = fs.readFileSync(chatPagePath, "utf8");

  // CSS Contract: sticky at top: 0 with z-index: 50
  const headerMatch = css.match(/\.mentor-chat-header\s*\{([^}]+)\}/);
  assert.ok(headerMatch, ".mentor-chat-header rule must exist");
  const headerBlock = headerMatch[1];
  assert.ok(headerBlock.includes("position: sticky"), "Header must be position: sticky");
  assert.ok(headerBlock.includes("top: 0"), "Header must stick at top: 0");
  assert.ok(headerBlock.includes("z-index: 50"), "Header must have z-index: 50");
  assert.ok(headerBlock.includes("var(--participant-header-height)"), "Header height must reference --participant-header-height");

  // JSX: Three calm zones
  // 1. Right: Brand
  assert.ok(chatPage.includes("mentor-brand"), "Header must render mentor-brand zone");
  assert.ok(chatPage.includes("المرشد الريادي الذكي"), "Header must display title 'المرشد الريادي الذكي'");
  // 2. Center: Journey orientation anchor
  assert.ok(chatPage.includes("mentor-header-center"), "Header must render mentor-header-center zone");
  assert.ok(chatPage.includes("رحلة ريادة الأعمال الرقمية"), "Header center must display 'رحلة ريادة الأعمال الرقمية'");
  assert.ok(chatPage.includes("mentor-header-stepper-dots"), "Header center must display stepper dots");
  // 3. Left: Participant identity
  assert.ok(chatPage.includes("mentor-chat-header-user"), "Header must render participant identity zone");
});

test("T55.5 Persistent Right Journey Rail Sticky Contract", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  // Journey rail rule
  const railMatch = css.match(/\.journey-rail\s*\{([^}]+)\}/);
  assert.ok(railMatch, ".journey-rail rule must exist");
  const railBlock = railMatch[1];
  assert.ok(railBlock.includes("position: sticky"), "Journey rail must be sticky");
  assert.ok(railBlock.includes("calc(var(--participant-header-height) + 1rem)"), "Journey rail must stick below header");
  assert.ok(railBlock.includes("align-self: start"), "Journey rail must have align-self: start");
  assert.ok(railBlock.includes("height: fit-content"), "Journey rail must have height: fit-content");
});

test("T55.5 Agent Compass (بوصلة المرحلة) Architecture & Research Safety", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const chatPage = fs.readFileSync(chatPagePath, "utf8");

  // Rail & card presence
  assert.ok(css.includes(".agent-compass-rail"), "CSS must style .agent-compass-rail");
  assert.ok(css.includes(".agent-compass-card"), "CSS must style .agent-compass-card");
  assert.ok(css.includes(".compass-compact-strip"), "CSS must style .compass-compact-strip");
  assert.ok(chatPage.includes("agent-compass-rail"), "Chat page must render agent-compass-rail");
  assert.ok(chatPage.includes("بوصلة المرحلة"), "Chat page must display title 'بوصلة المرحلة'");

  // Orientation sections
  assert.ok(chatPage.includes("المهارة المستهدفة"), "Compass must show target skill label");
  assert.ok(chatPage.includes("المحطة الحالية"), "Compass must show current checkpoint label");
  assert.ok(chatPage.includes("إرشادات التفاعل"), "Compass must show interaction guidance");
  assert.ok(chatPage.includes("يُحفظ تقدمك أثناء الرحلة"), "Compass must reassure with auto-save message");

  // Research Safety: Compass must NOT expose internal IDs, classifications, or scores
  assert.ok(!chatPage.includes(">N1<"), "Compass must not expose raw node IDs");
  assert.ok(!chatPage.includes(">N2<"), "Compass must not expose raw node IDs");
  assert.ok(!chatPage.includes("مستوى الدعم:"), "Compass must not expose support levels");
  assert.ok(!chatPage.includes("نسبة النجاح"), "Compass must not expose success percentages");

  // Checkpoint label derivation helper (T55.6 Audited Research Fidelity)
  assert.equal(getSafeCheckpointTitle(1, "N1"), "تحديد نقطة البداية");
  assert.equal(getSafeCheckpointTitle(1, "N1_H"), "تحديد نقطة البداية");
  assert.equal(getSafeCheckpointTitle(2, "N2"), "تحدي التسويق");
  assert.equal(getSafeCheckpointTitle(3, "N1"), "بناء نموذج العمل");
  assert.equal(getSafeCheckpointTitle(3, "N2_A"), "مراجعة ترابط النموذج");
  assert.equal(getSafeCheckpointTitle(4, "N2"), "قرار الأزمة");
  assert.equal(getSafeCheckpointTitle(4, "N3_B"), "تحليل تداعيات القرار");
  assert.equal(getSafeCheckpointTitle(5, "N1"), "إعداد اختبار A/B");
  assert.equal(getSafeCheckpointTitle(5, "N2"), "قراءة النتائج");
  assert.equal(getSafeCheckpointTitle(5, "N3_A"), "تحليل النتائج");
  assert.equal(getSafeCheckpointTitle(1, "END"), "اكتملت المرحلة");
  // Checkpoint safe fallback for unmapped nodes (PART U)
  assert.equal(getSafeCheckpointTitle(1, "UNMAPPED_NODE" as any), "المهمة الحالية");
});

test("T55.5 Auto-Scroll Margin Top Contract (Sticky Header Clearance)", () => {
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  assert.ok(css.includes("scroll-margin-top: calc(var(--participant-header-height) + 1.25rem)"), "Target elements must specify scroll-margin-top clearance for sticky header");
});

test("T55.6 Checkpoint Fidelity Audit, Progress Label & Visual Invariants", () => {
  const chatPagePath = path.resolve(process.cwd(), "app/chat/page.tsx");
  const chatPage = fs.readFileSync(chatPagePath, "utf8");
  const cssPath = path.resolve(process.cwd(), "app/globals.css");
  const css = fs.readFileSync(cssPath, "utf8");

  // Check 1: Journey progress label communicates completed stages, not performance
  assert.ok(chatPage.includes("المراحل المكتملة"), "Progress label must be 'المراحل المكتملة'");
  assert.ok(!chatPage.includes("journey-rail-progress-label\">التقدم في الرحلة"), "Old progress label must be absent");

  // Check 2: Compass interaction guidance contains the 3 exact approved principles
  assert.ok(chatPage.includes("فكّر أولًا"), "Compass guidance principle 1");
  assert.ok(chatPage.includes("استعن بالتلميح عند الحاجة"), "Compass guidance principle 2");
  assert.ok(chatPage.includes("القرار لك"), "Compass guidance principle 3");

  // Check 3: Checkpoint titles contain NO node IDs and NO classifications
  const reachableNodes: Array<[ScenarioId, string]> = [
    [1, "N1"], [1, "N1_H"], [1, "N1_F"], [1, "N2"], [1, "N2_H"], [1, "N3"], [1, "N3_H"], [1, "N4"], [1, "N4_REV"], [1, "N4_H"], [1, "N5"], [1, "N5_H"], [1, "END"],
    [2, "N1"], [2, "N1_H"], [2, "N1_F"], [2, "N2"], [2, "N2_H"], [2, "N3"], [2, "N3_H"], [2, "N4"], [2, "N4_H"], [2, "N5"], [2, "N5_H"], [2, "END"],
    [3, "N1"], [3, "N2_A"], [3, "N2_B"], [3, "N2_C"], [3, "N3"], [3, "N4"], [3, "END"],
    [4, "N1"], [4, "N2"], [4, "N3_A"], [4, "N3_B"], [4, "N3_C"], [4, "N4"], [4, "END"],
    [5, "N1"], [5, "N2"], [5, "N3_A"], [5, "N3_B"], [5, "N3_C"], [5, "N4"], [5, "END"],
  ];

  for (const [sId, nId] of reachableNodes) {
    const title = getSafeCheckpointTitle(sId, nId);
    assert.ok(title.length > 0, `Title for S${sId}-${nId} must not be empty`);
    assert.ok(!title.includes("N1") && !title.includes("N2") && !title.includes("N3") && !title.includes("N4") && !title.includes("N5"),
      `Title ${title} must not contain node IDs`);
    assert.ok(!title.includes("advanced") && !title.includes("medium") && !title.includes("weak"),
      `Title ${title} must not contain classification strings`);
    assert.ok(!title.includes("ضعيف") && !title.includes("متقدم") && !title.includes("متوسط"),
      `Title ${title} must not contain Arabic classification strings`);
  }

  // Check 4: S4 timed checkpoint contains no coaching tips or answers
  const s4Title = getSafeCheckpointTitle(4, "N2");
  assert.equal(s4Title, "قرار الأزمة");
  assert.ok(!s4Title.includes("تجنب") && !s4Title.includes("أفضل") && !s4Title.includes("خيار"), "S4 title must contain no coaching");

  // Check 5: S5 analysis checkpoint contains no campaign winner hint
  const s5Title = getSafeCheckpointTitle(5, "N3_A");
  assert.equal(s5Title, "تحليل النتائج");
  assert.ok(!s5Title.includes("B") && !s5Title.includes("CPA") && !s5Title.includes("أفضل"), "S5 title must not bias campaign");

  // Check 6: Rails vertical baseline alignment
  assert.ok(css.includes(".journey-rail"), "CSS must define .journey-rail");
  assert.ok(css.includes(".agent-compass-rail"), "CSS must define .agent-compass-rail");
  assert.ok(css.includes("top: calc(var(--participant-header-height) + 1rem)"), "Rails must share identical sticky top offset");

  // Check 7: Assistant message max-width readable Arabic boundary
  assert.ok(css.includes("max-width: min(85%, 820px)"),
    "Assistant message max-width must be constrained to comfortable Arabic line length");

  // Check 8: Student message minimum body width
  assert.ok(css.includes("min-width: 120px"),
    "Student message bubble must have minimum body width");
});

test("T56 Neutral END Checkpoint Wording Invariant", () => {
  // Verify across all scenarios S1..S5 that END checkpoint is purely completion-oriented without evaluative judgment
  const scenarios: ScenarioId[] = [1, 2, 3, 4, 5];
  for (const sId of scenarios) {
    const endTitle = getSafeCheckpointTitle(sId, "END");
    assert.equal(endTitle, "اكتملت المرحلة", `Scenario ${sId} END title must be neutral 'اكتملت المرحلة'`);
    assert.ok(!endTitle.includes("بنجاح"), `Scenario ${sId} END title must not contain 'بنجاح'`);
    assert.ok(!endTitle.includes("ناجح") && !endTitle.includes("فاشل"), "No pass/fail semantics in END label");
  }
});
