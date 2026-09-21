/**
 * Journey Data Model & Progress Utilities
 *
 * Source of Truth: research/scenarios/JOURNEY.md & PROJECT.md
 *
 * The experiment consists of ONE sequential journey across five skills:
 * S1 -> S2 -> S3 -> S4 -> S5 -> Complete
 *
 * Minimal engineering design:
 * - Deterministic progress derivation from current_scenario (1..5)
 * - Zero exposure of scores, classifications, or internal node IDs
 */

export type ScenarioId = 1 | 2 | 3 | 4 | 5;

export interface ScenarioMeta {
  id: ScenarioId;
  skillTitle: string;
  shortTitle: string;
  description: string;
}

export const SHORT_SKILL_TITLES: Record<ScenarioId, string> = {
  1: "الفرص",
  2: "الأفكار",
  3: "نموذج العمل",
  4: "المخاطر",
  5: "التسويق",
} as const;

export const STEPPER_SKILL_TITLES: Record<ScenarioId, string> = {
  1: "اكتشاف الفرص",
  2: "توليد الأفكار",
  3: "نموذج العمل",
  4: "المخاطر",
  5: "التسويق",
} as const;

export const SCENARIOS_JOURNEY: readonly ScenarioMeta[] = [
  {
    id: 1,
    skillTitle: "اكتشاف الفرص الرقمية",
    shortTitle: "الفرص",
    description: "تحليل مشكلة حقيقية وتحويلها إلى فرصة مشروع رقمي",
  },
  {
    id: 2,
    skillTitle: "توليد الأفكار الابتكارية",
    shortTitle: "الأفكار",
    description: "توليد أفكار رقمية جديدة وتطويرها استجابة للقيود",
  },
  {
    id: 3,
    skillTitle: "بناء وتخطيط نموذج العمل التجاري",
    shortTitle: "نموذج العمل",
    description: "تصميم كتل نموذج العمل والتحقق من التوافق المنطقي",
  },
  {
    id: 4,
    skillTitle: "اتخاذ القرار وإدارة المخاطر",
    shortTitle: "المخاطر",
    description: "محاكاة إدارة الأزمات والمقايضات تحت ضغط الوقت",
  },
  {
    id: 5,
    skillTitle: "التسويق الرقمي واتخاذ القرارات المبنية على البيانات",
    shortTitle: "التسويق",
    description: "اختبار الأداء A/B وقراءة لوحات البيانات والمؤشرات الاقتصادية",
  },
] as const;

export type ScenarioProgressState = "completed" | "active" | "upcoming";

export interface ScenarioProgressItem {
  id: ScenarioId;
  skillTitle: string;
  shortTitle: string;
  state: ScenarioProgressState;
}

/**
 * Returns the compact short title for a skill (e.g., "الفرص", "الأفكار").
 */
export function getShortSkillTitle(id: ScenarioId): string {
  return SHORT_SKILL_TITLES[id] || "";
}

/**
 * Derives the visual progress state for each of the five skills.
 *
 * Purely derived from current_scenario and overall completion status.
 * NEVER derived from score, classification, or AI evaluation.
 */
export function getJourneyProgress(
  currentScenario: number | null | undefined,
  isOverallCompleted: boolean = false
): ScenarioProgressItem[] {
  if (isOverallCompleted) {
    return SCENARIOS_JOURNEY.map((s) => ({
      id: s.id,
      skillTitle: s.skillTitle,
      shortTitle: s.shortTitle,
      state: "completed" as const,
    }));
  }

  const safeCurrent =
    typeof currentScenario === "number" && currentScenario >= 1 && currentScenario <= 5
      ? (currentScenario as ScenarioId)
      : 1;

  return SCENARIOS_JOURNEY.map((s) => {
    let state: ScenarioProgressState = "upcoming";
    if (s.id < safeCurrent) {
      state = "completed";
    } else if (s.id === safeCurrent) {
      state = "active";
    } else {
      state = "upcoming";
    }
    return {
      id: s.id,
      skillTitle: s.skillTitle,
      shortTitle: s.shortTitle,
      state,
    };
  });
}

/**
 * Returns metadata for a specific scenario by its 1..5 numeric ID.
 */
export function getScenarioMeta(id: ScenarioId): ScenarioMeta | undefined {
  return SCENARIOS_JOURNEY.find((s) => s.id === id);
}

/**
 * Calculates the next scenario ID in the sequential journey, or null if at the final scenario.
 */
export function getNextScenarioId(current: ScenarioId): ScenarioId | null {
  const next = current + 1;
  if (next >= 1 && next <= 5) {
    return next as ScenarioId;
  }
  return null;
}

/**
 * Checks if the given scenario ID is the terminal scenario in the journey.
 */
export function isLastScenario(id: ScenarioId): boolean {
  return id === 5;
}

/**
 * Calculates overall horizontal journey progress percentage (20%, 40%, 60%, 80%, 100%).
 * Strictly based on scenario sequence position (1..5), NEVER on scores or performance.
 */
export function getJourneyProgressPercent(
  currentScenario: number | null | undefined,
  isOverallCompleted: boolean = false
): number {
  if (isOverallCompleted) return 100;
  const safeCurrent =
    typeof currentScenario === "number" && currentScenario >= 1 && currentScenario <= 5
      ? currentScenario
      : 1;
  // Progress means completed journey stages only:
  // Before completing S1: 0%
  // After S1 (S2 active): 20%
  // After S2 (S3 active): 40%
  // After S3 (S4 active): 60%
  // After S4 (S5 active): 80%
  // After completing S5: 100%
  return (safeCurrent - 1) * 20;
}

/**
 * Formats elapsed active session time into MM:SS or HH:MM:SS.
 * UI-only helper; not written to DB.
 */
export function formatElapsedActiveTime(totalSeconds: number): string {
  if (typeof totalSeconds !== "number" || isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Maps the current scenario and internal node ID to a participant-safe, human-readable Arabic checkpoint title.
 * Used for orientation in the Agent Compass ("بوصلة المرحلة").
 * Strictly contains NO internal IDs (N1/N2), NO classifications, and NO future branch spoilers.
 */
export function getSafeCheckpointTitle(scenarioId: ScenarioId, nodeId: string): string {
  if (nodeId === "END") {
    return "اكتمال المحطة الحالية بنجاح";
  }

  switch (scenarioId) {
    case 1:
      if (nodeId === "N1") return "استكشاف الفرصة وتحديد الفكرة";
      if (nodeId === "N1_H") return "طلب التلميح والتوجيه";
      if (nodeId === "N1_F") return "خيارات المتابعة والحلول";
      if (nodeId === "N2") return "تحديد المشكلة والتحقق";
      if (nodeId === "N2_H") return "توجيه التحقق من المشكلة";
      if (nodeId === "N3") return "صياغة القيمة والحل المقترح";
      if (nodeId === "N3_H") return "إعادة التفكير في صياغة الحل";
      if (nodeId === "N4") return "التحقق الميداني مع العملاء";
      if (nodeId === "N4_H") return "توجيه التحقق الميداني";
      if (nodeId === "N4_REV") return "مراجعة نموذج التحقق";
      if (nodeId === "N5") return "النموذج الأولي والجدوى";
      if (nodeId === "N5_H") return "توجيه النموذج الأولي";
      return "استكشاف الفرص الرقمية";

    case 2:
      if (nodeId === "N1") return "اقتراح الفكرة الأولية";
      if (nodeId === "N2") return "تحدي الميزانية (التسويق بصفر تكلفة)";
      if (nodeId === "N3") return "تحدي المنافسة والتمايز";
      if (nodeId === "N4") return "إعادة بناء وتطوير الفكرة";
      if (nodeId === "N4_H") return "توجيه تطوير الفكرة";
      if (nodeId === "N5") return "اختبار قابلية التوسع والنمو";
      if (nodeId === "N5_H") return "توجيه قابلية التوسع";
      return "توليد الأفكار الابتكارية";

    case 3:
      if (nodeId === "N1") return "إعداد لوحة نموذج العمل";
      if (nodeId.includes("A") || nodeId.includes("PRICE")) return "مراجعة تسعير القيمة والعملاء";
      if (nodeId.includes("B") || nodeId.includes("COST")) return "مراجعة هيكل التكاليف والقيمة";
      if (nodeId.includes("C") || nodeId.includes("CHANNEL")) return "مراجعة القنوات والشرائح";
      if (nodeId === "N4") return "اعتماد نموذج العمل التجاري";
      return "تخطيط نموذج العمل التجاري";

    case 4:
      if (nodeId === "N1") return "مرحلة الاستقرار والتشغيل";
      if (nodeId === "N2") return "إدارة الأزمة السيبرانية (قرار زمني)";
      if (nodeId.startsWith("N3")) return "تقييم تداعيات القرار المتخذ";
      if (nodeId === "N4") return "استراتيجية التعافي وإدارة السمعة";
      return "إدارة الأزمات والمخاطر";

    case 5:
      if (nodeId === "N1") return "إعداد عناوين اختبار A/B";
      if (nodeId === "N2") return "تحليل نتائج اختبار الحملات";
      if (nodeId.startsWith("N3")) return "توجيه القرار التسويقي";
      if (nodeId === "N4") return "تخصيص الميزانية المتبقية";
      return "التحليل التسويقي المبني على البيانات";

    default:
      return "المحطة الحالية";
  }
}
