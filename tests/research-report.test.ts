import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveParticipantSummary,
  deriveScenario1Report,
  deriveScenario2Report,
  deriveScenario3Report,
  deriveScenario4Report,
  deriveScenario5Report,
  deriveFullParticipantReport,
  formatDuration,
} from "../lib/research/report";
import type { SessionRecord, InteractionRecord } from "../lib/server/persistence";

describe("Researcher Report Derivation & Objective Evidence", () => {
  const mockSession: SessionRecord = {
    id: "test-session-123",
    student_name: "أحمد عبد الله",
    student_code: "TEST_STU_001",
    status: "completed",
    current_scenario: 5,
    current_node: "END",
    scenario_version: "2.0",
    prompt_version: "0.3",
    provider: "groq",
    model_id: "openai/gpt-oss-120b",
    started_at: "2026-09-20T10:00:00.000Z",
    finished_at: "2026-09-20T10:15:30.000Z", // 15m 30s
  };

  const mockInteractions: InteractionRecord[] = [
    // S1
    {
      id: "i1",
      session_id: "test-session-123",
      scenario_id: 1,
      node_id: "N1",
      student_answer: "مقابلات واستبيانات ميدانية مع طلاب الجامعات",
      classification: "advanced",
      agent_feedback: "ممتاز",
      next_node: "N2",
      decision_time_ms: null,
      turn_kind: "evaluated_answer",
      created_at: "2026-09-20T10:01:00.000Z",
    },
    {
      id: "i2",
      session_id: "test-session-123",
      scenario_id: 1,
      node_id: "N2",
      student_answer: "ممكن تبسط السؤال وتديني مثال؟",
      classification: null,
      agent_feedback: "بالتأكيد...",
      next_node: "N2",
      decision_time_ms: null,
      turn_kind: "conversational_support",
      created_at: "2026-09-20T10:02:00.000Z",
    },
    {
      id: "i3",
      session_id: "test-session-123",
      scenario_id: 1,
      node_id: "N5",
      student_answer: "الفرصة النهائية هي منصة الكتب والمراجع المخفضة للطلاب",
      classification: "advanced",
      agent_feedback: "تهانينا",
      next_node: "END",
      decision_time_ms: null,
      turn_kind: "evaluated_answer",
      created_at: "2026-09-20T10:03:00.000Z",
    },
    // S2
    {
      id: "i4",
      session_id: "test-session-123",
      scenario_id: 2,
      node_id: "N1",
      student_answer: "الفكرة الأولية: تطبيق لتبادل الكتب الدراسية القديمة بين الطلاب",
      classification: "medium",
      agent_feedback: "جيد ولكن...",
      next_node: "N2",
      decision_time_ms: null,
      turn_kind: "evaluated_answer",
      created_at: "2026-09-20T10:04:00.000Z",
    },
    {
      id: "i5",
      session_id: "test-session-123",
      scenario_id: 2,
      node_id: "N4",
      student_answer: "الفكرة المعاد بناؤها: شبكة رقمية موثقة لتبادل المراجع الأكاديمية بنظام نقاط تحفيزي",
      classification: "advanced",
      agent_feedback: "تطور ممتاز",
      next_node: "N5",
      decision_time_ms: null,
      turn_kind: "evaluated_answer",
      created_at: "2026-09-20T10:06:00.000Z",
    },
    // S3
    {
      id: "i6",
      session_id: "test-session-123",
      scenario_id: 3,
      node_id: "N1",
      student_answer: JSON.stringify({
        customerSegments: "طلاب الجامعات الحكومية والخاصة",
        valueProposition: "توفير المراجع بنصف التكلفة والوصول السريع للملخصات",
        channels: "تطبيق الهاتف الذكي وشراكات مع مجالس الطلبة",
        revenueStreams: "اشتراك رمزي فصلي 10 دولار ورسوم إعلانات للمكتبات",
        costStructure: "استضافة سحابية وتطوير برمجي ومكافآت سفراء الجامعات",
      }),
      classification: null,
      agent_feedback: "نموذج متكامل",
      next_node: "N4",
      decision_time_ms: null,
      turn_kind: "evaluated_answer",
      created_at: "2026-09-20T10:08:00.000Z",
    },
    // S4
    {
      id: "i7",
      session_id: "test-session-123",
      scenario_id: 4,
      node_id: "N2",
      student_answer: "CRISIS_START",
      classification: null,
      agent_feedback: null,
      next_node: null,
      decision_time_ms: null,
      turn_kind: "non_evaluated_answer",
      created_at: "2026-09-20T10:09:00.000Z",
    },
    {
      id: "i8",
      session_id: "test-session-123",
      scenario_id: 4,
      node_id: "N2",
      student_answer: JSON.stringify({ choice: "A", timeout: false }),
      classification: null,
      agent_feedback: "عزل الخادم المصاب فوراً",
      next_node: "N3_A",
      decision_time_ms: 12450,
      turn_kind: "non_evaluated_answer",
      created_at: "2026-09-20T10:09:12.450Z",
    },
    {
      id: "i9",
      session_id: "test-session-123",
      scenario_id: 4,
      node_id: "N4",
      student_answer: JSON.stringify({ choice: "A" }),
      classification: null,
      agent_feedback: "خيار الشفافية التامة",
      next_node: "END",
      decision_time_ms: null,
      turn_kind: "non_evaluated_answer",
      created_at: "2026-09-20T10:10:00.000Z",
    },
    // S5
    {
      id: "i10",
      session_id: "test-session-123",
      scenario_id: 5,
      node_id: "N1",
      student_answer: JSON.stringify({
        headlineA: "احصل على كتبك الجامعية بنصف السعر الآن!",
        headlineB: "وفر 70% من ميزانية مراجعك الأكاديمية هذا الفصل!",
      }),
      classification: null,
      agent_feedback: "إطلاق الحملات التجريبية",
      next_node: "N2",
      decision_time_ms: null,
      turn_kind: "non_evaluated_answer",
      created_at: "2026-09-20T10:12:00.000Z",
    },
    {
      id: "i11",
      session_id: "test-session-123",
      scenario_id: 5,
      node_id: "N2",
      student_answer: JSON.stringify({
        selectedChoice: "choose_b",
        reasoning: "الحملة ب حققت 20 عميلاً فعلياً مقابل 5 فقط في الحملة أ، وتكلفة الاستحواذ 5$ مقابل 20$",
      }),
      classification: "advanced",
      agent_feedback: "تحليل سليم يركز على تكلفة الاستحواذ",
      next_node: "N3_B",
      decision_time_ms: null,
      turn_kind: "evaluated_answer",
      created_at: "2026-09-20T10:13:00.000Z",
    },
    {
      id: "i12",
      session_id: "test-session-123",
      scenario_id: 5,
      node_id: "N4",
      student_answer: "توجيه الميزانية المتبقية 800 دولار كاملة للحملة (ب)",
      classification: null,
      agent_feedback: "قرار استثماري مدروس",
      next_node: "END",
      decision_time_ms: null,
      turn_kind: "non_evaluated_answer",
      created_at: "2026-09-20T10:15:00.000Z",
    },
  ];

  it("1. deriveParticipantSummary correctly parses metrics and excludes CRISIS_START from learner counts", () => {
    const summary = deriveParticipantSummary(mockSession, mockInteractions);

    assert.equal(summary.studentName, "أحمد عبد الله");
    assert.equal(summary.studentCode, "TEST_STU_001");
    assert.equal(summary.status, "completed");
    assert.equal(summary.completedSkillsCount, 5);

    // Total interactions in mock is 12
    assert.equal(summary.totalInteractions, 12);

    // Evaluated count: i1, i3, i4, i5, i6, i11 = 6
    assert.equal(summary.evaluatedCount, 6);

    // Support count: i2 = 1
    assert.equal(summary.supportCount, 1);

    // Non-evaluated count (excluding CRISIS_START): i8, i9, i10, i12 = 4
    assert.equal(summary.nonEvaluatedCount, 4);

    // Classifications: 4 advanced, 1 medium, 0 weak
    assert.equal(summary.advancedCount, 4);
    assert.equal(summary.mediumCount, 1);
    assert.equal(summary.weakCount, 0);

    // Duration: 10:00:00 to 10:15:30 = 930 seconds
    assert.equal(summary.durationSeconds, 930);
    assert.ok(summary.durationFormatted.includes("15 دقيقة"));
  });

  it("2. deriveScenario1Report captures opportunity path and support turns", () => {
    const s1Report = deriveScenario1Report(mockInteractions);

    assert.equal(s1Report.visited, true);
    assert.equal(s1Report.evaluatedAnswers.length, 2);
    assert.equal(s1Report.supportTurns.length, 1);
    assert.equal(s1Report.supportTurns[0].query, "ممكن تبسط السؤال وتديني مثال؟");
    assert.ok(s1Report.finalOpportunity?.includes("الكتب والمراجع المخفضة"));
  });

  it("3. deriveScenario2Report captures initial and rebuilt idea side-by-side", () => {
    const s2Report = deriveScenario2Report(mockInteractions);

    assert.equal(s2Report.visited, true);
    assert.ok(s2Report.initialIdea?.includes("تطبيق لتبادل الكتب الدراسية"));
    assert.ok(s2Report.rebuiltIdea?.includes("شبكة رقمية موثقة لتبادل المراجع"));
    assert.notEqual(s2Report.initialIdea, s2Report.rebuiltIdea);
  });

  it("4. deriveScenario3Report decodes all five business model blocks and detects gap path", () => {
    const s3Report = deriveScenario3Report(mockInteractions);

    assert.equal(s3Report.visited, true);
    assert.ok(s3Report.businessModel !== null);
    assert.equal(s3Report.businessModel?.customerSegments, "طلاب الجامعات الحكومية والخاصة");
    assert.equal(s3Report.businessModel?.valueProposition, "توفير المراجع بنصف التكلفة والوصول السريع للملخصات");
    assert.equal(s3Report.businessModel?.channels, "تطبيق الهاتف الذكي وشراكات مع مجالس الطلبة");
    assert.equal(s3Report.businessModel?.revenueStreams, "اشتراك رمزي فصلي 10 دولار ورسوم إعلانات للمكتبات");
    assert.equal(s3Report.businessModel?.costStructure, "استضافة سحابية وتطوير برمجي ومكافآت سفراء الجامعات");
    assert.equal(s3Report.detectedGapPath, "coherent");
  });

  it("5. deriveScenario4Report extracts crisis choice, timing, and recovery without counting CRISIS_START as attempt", () => {
    const s4Report = deriveScenario4Report(mockInteractions);

    assert.equal(s4Report.visited, true);
    assert.equal(s4Report.choice, "A");
    assert.equal(s4Report.timeout, false);
    assert.equal(s4Report.decisionTimeMs, 12450);
    assert.equal(s4Report.consequenceNode, "N3_A");
    assert.equal(s4Report.recoveryChoice, "A");
    assert.equal(s4Report.recoveryStrategy, "شفافية كاملة مع العملاء والجمهور");
  });

  it("6. deriveScenario5Report extracts headlines, analytical campaign choice, and fixed benchmarks", () => {
    const s5Report = deriveScenario5Report(mockInteractions);

    assert.equal(s5Report.visited, true);
    assert.ok(s5Report.headlineA?.includes("احصل على كتبك الجامعية"));
    assert.ok(s5Report.headlineB?.includes("وفر 70% من ميزانية مراجعك"));
    assert.equal(s5Report.selectedCampaign, "B");
    assert.equal(s5Report.analyticalBranch, "advanced_roi");
    assert.ok(s5Report.budgetAllocation?.includes("800 دولار"));
    assert.ok(s5Report.fixedBenchmarks.campaignA.includes("20$"));
    assert.ok(s5Report.fixedBenchmarks.campaignB.includes("5$"));
  });

  it("7. deriveFullParticipantReport aggregates all sections with 0 invented scores", () => {
    const full = deriveFullParticipantReport(mockSession, mockInteractions);

    assert.equal(full.summary.studentCode, "TEST_STU_001");
    assert.equal(full.scenario1.visited, true);
    assert.equal(full.scenario2.visited, true);
    assert.equal(full.scenario3.visited, true);
    assert.equal(full.scenario4.visited, true);
    assert.equal(full.scenario5.visited, true);
    assert.equal(full.chronologicalInteractions.length, 12);

    // Verify absence of invented metrics
    assert.equal((full as any).masteryPercentage, undefined);
    assert.equal((full as any).totalScore, undefined);
    assert.equal((full as any).grade, undefined);
  });
});
