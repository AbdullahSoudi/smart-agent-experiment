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
  description: string;
}

export const SCENARIOS_JOURNEY: readonly ScenarioMeta[] = [
  {
    id: 1,
    skillTitle: "اكتشاف الفرص الرقمية",
    description: "تحليل مشكلة حقيقية وتحويلها إلى فرصة مشروع رقمي",
  },
  {
    id: 2,
    skillTitle: "توليد الأفكار الابتكارية",
    description: "توليد أفكار رقمية جديدة وتطويرها استجابة للقيود",
  },
  {
    id: 3,
    skillTitle: "بناء وتخطيط نموذج العمل التجاري",
    description: "تصميم كتل نموذج العمل والتحقق من التوافق المنطقي",
  },
  {
    id: 4,
    skillTitle: "اتخاذ القرار وإدارة المخاطر",
    description: "محاكاة إدارة الأزمات والمقايضات تحت ضغط الوقت",
  },
  {
    id: 5,
    skillTitle: "التسويق الرقمي واتخاذ القرارات المبنية على البيانات",
    description: "اختبار الأداء A/B وقراءة لوحات البيانات والمؤشرات الاقتصادية",
  },
] as const;

export type ScenarioProgressState = "completed" | "active" | "upcoming";

export interface ScenarioProgressItem {
  id: ScenarioId;
  skillTitle: string;
  state: ScenarioProgressState;
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