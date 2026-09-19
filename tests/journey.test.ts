import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCENARIOS_JOURNEY,
  getJourneyProgress,
  getScenarioMeta,
  getNextScenarioId,
  isLastScenario,
  type ScenarioId,
} from "../lib/journey";
import {
  normalizeStudentName,
  validateStudentName,
  MAX_STUDENT_NAME_LENGTH,
} from "../lib/validation";
import {
  SCENARIO_NODES_V2_0_DEV,
  SCENARIO_NODES_V1_0,
  SCENARIO_NODES_V1_1,
  getScenarioNodes,
  SCENARIO_1_CANONICAL_OPENING,
} from "../lib/scenario";

describe("T54.2 Sequential Journey Metadata & Progress Derivation", () => {
  it("ordered scenarios contains exactly 5 sequential skills in mandatory order", () => {
    assert.equal(SCENARIOS_JOURNEY.length, 5);
    const ids = SCENARIOS_JOURNEY.map((s) => s.id);
    assert.deepEqual(ids, [1, 2, 3, 4, 5]);

    assert.equal(SCENARIOS_JOURNEY[0].skillTitle, "اكتشاف الفرص الرقمية");
    assert.equal(SCENARIOS_JOURNEY[1].skillTitle, "توليد الأفكار الابتكارية");
    assert.equal(SCENARIOS_JOURNEY[2].skillTitle, "بناء وتخطيط نموذج العمل التجاري");
    assert.equal(SCENARIOS_JOURNEY[3].skillTitle, "اتخاذ القرار وإدارة المخاطر");
    assert.equal(
      SCENARIOS_JOURNEY[4].skillTitle,
      "التسويق الرقمي واتخاذ القرارات المبنية على البيانات"
    );
  });

  it("scenario 1 active produces 0 completed, 1 active, and 4 upcoming", () => {
    const progress = getJourneyProgress(1);
    assert.equal(progress.length, 5);

    const completed = progress.filter((p) => p.state === "completed");
    const active = progress.filter((p) => p.state === "active");
    const upcoming = progress.filter((p) => p.state === "upcoming");

    assert.equal(completed.length, 0);
    assert.equal(active.length, 1);
    assert.equal(active[0].id, 1);
    assert.equal(upcoming.length, 4);
    assert.deepEqual(
      upcoming.map((u) => u.id),
      [2, 3, 4, 5]
    );
  });

  it("scenario 3 active produces 2 completed, 1 active, and 2 upcoming", () => {
    const progress = getJourneyProgress(3);
    assert.equal(progress.length, 5);

    const completed = progress.filter((p) => p.state === "completed");
    const active = progress.filter((p) => p.state === "active");
    const upcoming = progress.filter((p) => p.state === "upcoming");

    assert.equal(completed.length, 2);
    assert.deepEqual(
      completed.map((c) => c.id),
      [1, 2]
    );
    assert.equal(active.length, 1);
    assert.equal(active[0].id, 3);
    assert.equal(upcoming.length, 2);
    assert.deepEqual(
      upcoming.map((u) => u.id),
      [4, 5]
    );
  });

  it("scenario 5 active produces 4 completed, 1 active, and 0 upcoming", () => {
    const progress = getJourneyProgress(5);
    assert.equal(progress.length, 5);

    const completed = progress.filter((p) => p.state === "completed");
    const active = progress.filter((p) => p.state === "active");
    const upcoming = progress.filter((p) => p.state === "upcoming");

    assert.equal(completed.length, 4);
    assert.deepEqual(
      completed.map((c) => c.id),
      [1, 2, 3, 4]
    );
    assert.equal(active.length, 1);
    assert.equal(active[0].id, 5);
    assert.equal(upcoming.length, 0);
  });

  it("overall completion is separate from Scenario 1 completion", () => {
    // Scenario 1 ending does NOT mean overall journey is completed
    const s1CompletedProgress = getJourneyProgress(1, false);
    assert.equal(s1CompletedProgress.filter((p) => p.state === "completed").length, 0);

    // Only full journey completion marks all 5 scenarios completed
    const fullCompletedProgress = getJourneyProgress(5, true);
    assert.equal(fullCompletedProgress.filter((p) => p.state === "completed").length, 5);
    assert.equal(fullCompletedProgress.filter((p) => p.state === "active").length, 0);
    assert.equal(fullCompletedProgress.filter((p) => p.state === "upcoming").length, 0);
  });

  it("next scenario transitions and terminal checks work correctly", () => {
    assert.equal(getNextScenarioId(1), 2);
    assert.equal(getNextScenarioId(2), 3);
    assert.equal(getNextScenarioId(3), 4);
    assert.equal(getNextScenarioId(4), 5);
    assert.equal(getNextScenarioId(5), null);

    assert.equal(isLastScenario(1), false);
    assert.equal(isLastScenario(4), false);
    assert.equal(isLastScenario(5), true);
  });
});

describe("T54.2 Student Name Validation & Normalization", () => {
  it("normalizes student names safely by collapsing repeated whitespace", () => {
    assert.equal(normalizeStudentName("   أحمد   علي   "), "أحمد علي");
    assert.equal(normalizeStudentName("فاطمة\t\tمحمد\nالسيد"), "فاطمة محمد السيد");
  });

  it("rejects empty, whitespace-only, and non-string names", () => {
    assert.equal(validateStudentName("").valid, false);
    assert.equal(validateStudentName("   ").valid, false);
    assert.equal(validateStudentName(null).valid, false);
    assert.equal(validateStudentName(undefined).valid, false);
    assert.equal(validateStudentName(123).valid, false);
  });

  it("rejects excessively long names exceeding maximum length", () => {
    const longName = "أ".repeat(MAX_STUDENT_NAME_LENGTH + 1);
    const res = validateStudentName(longName);
    assert.equal(res.valid, false);
  });

  it("accepts valid Arabic names", () => {
    const res = validateStudentName("  عبدالله محمد سعودي  ");
    assert.equal(res.valid, true);
    assert.equal(res.normalized, "عبدالله محمد سعودي");
  });
});

describe("T54.2 Scenario 1 Canonical Researcher Text Verbatim Check", () => {
  it("v2.0 contains canonical researcher-authored opening verbatim", () => {
    assert.ok(SCENARIO_1_CANONICAL_OPENING.includes("مرحباً بك."));
    assert.ok(
      SCENARIO_1_CANONICAL_OPENING.includes(
        "تخيل أنك تريد إنشاء مشروع رقمي صغير يمكن أن يحقق لك استقلالاً مالياً"
      )
    );
    assert.ok(
      SCENARIO_1_CANONICAL_OPENING.includes(
        "أمامك فرصة للبحث عن مشكلة حقيقية يعاني منها إحدى الفئات المستهدفة"
      )
    );
  });

  it("v2.0 N1 prompt is researcher canonical verbatim", () => {
    const n1 = SCENARIO_NODES_V2_0_DEV.N1;
    assert.ok(n1.prompt?.includes("لديك ميزانية محدودة ولا توجد لديك فكرة مشروع محددة حتى الآن"));
    assert.ok(n1.prompt?.includes("أ) البحث أولاً عن احتياجات ومشكلات العملاء."));
    assert.ok(
      n1.prompt?.includes(
        "ب) اختيار فكرة منتج تعجبك ثم محاولة إقناع الناس بشرائها."
      )
    );
    assert.ok(n1.prompt?.includes("أي الخيارين تختار؟ ولماذا؟"));
  });

  it("v2.0 N1_F golden rule and prompt are researcher canonical verbatim", () => {
    const n1f = SCENARIO_NODES_V2_0_DEV.N1_F;
    assert.ok(
      n1f.prompt?.includes(
        'القاعدة الذهبية في ريادة الأعمال الرقمية هي: "لا تبحث عن عملاء لمنتجك، بل ابحث عن منتج لعملائك."'
      )
    );
    assert.ok(
      n1f.prompt?.includes("1. تصميم تطبيق متطور ثم البحث عمن يشتريه.")
    );
    assert.ok(
      n1f.prompt?.includes("2. رصد مشكلة يواجهها الناس ثم تصميم تطبيق لحلها.")
    );
  });

  it("getScenarioNodes preserves backward compatibility for v1.0 and v1.1", () => {
    const v10 = getScenarioNodes("1.0");
    const v11 = getScenarioNodes("1.1");
    const v20 = getScenarioNodes("2.0");

    // v1.0 prompt check
    assert.ok(v10.N1.prompt?.includes("أنت طالب جامعي تلاحظ أن زملاءك"));

    // v1.1 prompt check
    assert.ok(v11.N1.prompt?.includes("أنت طالب جامعي، وشايف إن زمايلك بيعانوا"));

    // v2.0 prompt check
    assert.ok(
      v20.N1.prompt?.includes("لديك ميزانية محدودة ولا توجد لديك فكرة مشروع محددة")
    );
  });
});

describe("T54.2 Participant Identity & Lookup Invariants", () => {
  type MockSession = {
    id: string;
    student_name: string | null;
    student_code: string;
    status: string;
    current_scenario: number | null;
  };

  function decideStartAction(
    enteredName: string,
    enteredCode: string,
    existingSessions: MockSession[]
  ): { action: "new" | "resume" | "completed" | "conflict" | "legacy_blocked"; message?: string } {
    const normEntered = normalizeStudentName(enteredName);

    if (existingSessions.length === 0) {
      return { action: "new" };
    }

    const completed = existingSessions.find((s) => s.status === "completed");
    if (completed) {
      if (completed.student_name !== null) {
        const storedNorm = normalizeStudentName(completed.student_name);
        if (storedNorm !== normEntered) {
          return {
            action: "conflict",
            message: "الاسم المدخل لا يطابق البيانات المسجلة لهذا الكود. راجع الباحث قبل المتابعة.",
          };
        }
      }
      return {
        action: "completed",
        message: "لقد أتممت التجربة بالفعل. شكرًا لمشاركتك.",
      };
    }

    const active = existingSessions.find((s) => s.status === "active");
    if (active) {
      if (active.student_name === null) {
        return {
          action: "legacy_blocked",
          message: "هذا الكود مرتبط ببيانات سابقة للنظام. يرجى استخدام كود المشارك المخصص لك أو مراجعة الباحث.",
        };
      }
      const storedNorm = normalizeStudentName(active.student_name);
      if (storedNorm !== normEntered) {
        return {
          action: "conflict",
          message: "الاسم المدخل لا يطابق البيانات المسجلة لهذا الكود. راجع الباحث قبل المتابعة.",
        };
      }
      return { action: "resume" };
    }

    return { action: "new" };
  }

  it("new student code produces new session creation", () => {
    const res = decideStartAction("طالب جديد", "CODE_NEW_01", []);
    assert.equal(res.action, "new");
  });

  it("active same name and code resumes the same session", () => {
    const existing: MockSession[] = [
      {
        id: "sess-1",
        student_name: "أحمد محمد",
        student_code: "CODE_01",
        status: "active",
        current_scenario: 1,
      },
    ];
    const res = decideStartAction("  أحمد   محمد  ", "CODE_01", existing);
    assert.equal(res.action, "resume");
  });

  it("active code with conflicting name rejects safely without revealing stored name", () => {
    const existing: MockSession[] = [
      {
        id: "sess-1",
        student_name: "أحمد محمد",
        student_code: "CODE_01",
        status: "active",
        current_scenario: 1,
      },
    ];
    const res = decideStartAction("خالد عبدالحميد", "CODE_01", existing);
    assert.equal(res.action, "conflict");
    assert.ok(res.message?.includes("الاسم المدخل لا يطابق البيانات المسجلة"));
    assert.ok(!res.message?.includes("أحمد محمد")); // NEVER reveal stored name
  });

  it("completed code blocks restart with completion message", () => {
    const existing: MockSession[] = [
      {
        id: "sess-completed",
        student_name: "سارة حسن",
        student_code: "CODE_COMPLETED",
        status: "completed",
        current_scenario: 5,
      },
    ];
    const res = decideStartAction("سارة حسن", "CODE_COMPLETED", existing);
    assert.equal(res.action, "completed");
    assert.ok(res.message?.includes("أتممت التجربة بالفعل"));
  });

  it("legacy sessions with null student_name are not silently migrated or overwritten", () => {
    const existing: MockSession[] = [
      {
        id: "legacy-sess",
        student_name: null,
        student_code: "PILOT_01",
        status: "active",
        current_scenario: null,
      },
    ];
    const res = decideStartAction("أي اسم", "PILOT_01", existing);
    assert.equal(res.action, "legacy_blocked");
  });
});