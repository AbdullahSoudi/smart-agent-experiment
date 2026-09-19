/**
 * Scenario 4 Data Model, Canonical Prompts & Deterministic Transitions
 *
 * Source of Truth: research/scenarios/scenario-4.md
 * Skill Title: اتخاذ القرار وإدارة المخاطر
 * Scenario ID: S4
 * Sequential Position: 4 of 5
 * Primary Interaction Mode: Time-bound crisis simulation (محاكاة زمنية قائمة على صدمة مفاجئة)
 *
 * INVARIANTS:
 * - All researcher canonical texts are verbatim.
 * - Deterministic application-owned routing.
 * - 60-second countdown timer anchored to persisted database timestamp.
 * - Refresh never resets timer; timeout transitions deterministically to N3-C.
 * - Race safety: atomic conditional transition guarantees single-winner decision.
 * - Scenario 4 completion advances ONLY to Scenario 5 (never overall completion).
 */

export type NodeIdS4 =
  | "N1"
  | "N2"
  | "N3_A"
  | "N3_B"
  | "N3_C"
  | "N4"
  | "END";

export interface Scenario4Node {
  id: NodeIdS4;
  title: string;
  prompt: string;
  choices?: readonly string[];
}

export const SCENARIO_4_START_NODE_ID: NodeIdS4 = "N1";

// 1. Calm Opening (N1)
export const SCENARIO_4_CALM_OPENING =
  "مرحباً بك. بعد تصميم نموذج العمل التجاري، تم إطلاق مشروعك بنجاح. الخوادم تعمل بكفاءة، وعدد المستخدمين في تزايد، وقد بدأت في تحقيق أولى إيراداتك.. تهانينا!";

// 2. Sudden Crisis Shock Alert (N2)
export const SCENARIO_4_CRISIS_ALERT =
  "تنبيه عاجل من الوكيل الذكي!\n\nنتعرض الآن لهجوم سيبراني شرس DDoS ومحاولة اختراق. المهاجمون يحاولون الوصول إلى قواعد بيانات مستخدميك (التي تضم بياناتهم الشخصية والمالية).\n\nإذا استمر الهجوم، سيتم تسريب البيانات. إذا أوقفت الخوادم، ستتوقف الخدمة فوراً وتخسر مبيعات اليوم وبعض ثقة العملاء.\n\nالوقت ينفد.. أمامك 3 خيارات أحلاها مر، ماذا ستفعل؟ (العداد: 00:59)";

// 3. Crisis Choices (N2)
export const CRISIS_CHOICE_A =
  "إيقاف الخوادم (Servers) والتطبيقات فوراً لفصل النظام عن الإنترنت وحماية البيانات، وإبلاغ المستخدمين بالعطل التقني.";

export const CRISIS_CHOICE_B =
  "التعاقد الفوري مع شركة أمن سيبراني خارجية لصد الهجوم وإبقاء الموقع يعمل، بتكلفة تعادل أرباحك المتوقعة للستة أشهر القادمة.";

export const CRISIS_CHOICE_C =
  "إبقاء الخوادم تعمل ومحاولة استكمال العمليات البيعية الحالية لتجنب غضب العملاء، على أمل أن يتوقف الهجوم تلقائياً.";

export const CRISIS_CHOICES = [
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
] as const;

// 4. Consequence Feedback (N3)
export const N3_A_CONSEQUENCE =
  "قرار شجاع. لقد أوقفت خوادم الواجهة الخلفية (Backend) وحميت بيانات عملائك بنجاح، لكنك خسرت مبيعات اليوم وتلقيت شكاوى عديدة بسبب توقف الخدمة المفاجئ. أحياناً تكون الخسارة المالية المؤقتة أفضل من فقدان السمعة للأبد.";

export const N3_B_CONSEQUENCE =
  "لقد نجوت من الهجوم وبقيت الخدمة مستقرة. لكن على حساب التمكين الاقتصادي للمشروع! ميزانيتك الآن شبه منعدمة. لقد ضحيت بالاستدامة المالية من أجل الاستقرار التقني.";

export const N3_C_CONSEQUENCE =
  "قرار كارثي! تم اختراق قواعد البيانات وتسريب بيانات عملائك. في ريادة الأعمال الرقمية والأمن السيبراني، المخاطرة ببيانات العملاء تعني تدمير العلامة التجارية والملاحقة القانونية. الثقة هي العملة الأغلى.. دعنا نعود لإنقاذ ما يمكن إنقاذه.";

// 5. Recovery Decision (N4)
export const RECOVERY_PROMPT =
  "الأزمة تركت آثاراً (سواء توقف الخدمة أو فقدان الميزانية). ما هي خطوتك القادمة لامتصاص غضب العملاء أو تعويض الخسارة؟";

export const RECOVERY_CHOICE_A =
  "إرسال رسالة اعتذار شفافة مع خصم خاص للعملاء.";

export const RECOVERY_CHOICE_B =
  "إخفاء سبب العطل والقول بأنه \"تحديث روتيني\".";

export const RECOVERY_CHOICES = [
  RECOVERY_CHOICE_A,
  RECOVERY_CHOICE_B,
] as const;

export const RECOVERY_FEEDBACK_A =
  "تصرف احترافي وواعٍ. الشفافية والاعتذار مع تعويض العملاء يحول الأزمة إلى فرصة لتعزيز الولاء وبناء سمعة قوية ومستدامة على المدى الطويل.";

export const RECOVERY_FEEDBACK_B =
  "محاولة إخفاء الحقيقة مخاطرة مضاعفة. في العصر الرقمي سرعان ما تتكشف الحقائق، وفقدان المصداقية يدمر المشروع أسرع من الأزمات التقنية ذاتها.";

// 6. Scenario 4 End Canonical Text
export const S4_END_TEXT =
  "تحليل الأداء في ظل الأزمة:\n\n- الوعي بالمقايضات (Trade-offs): أدركت أن حماية الأصول الرقمية (بيانات العملاء) أهم من الأرباح اللحظية المؤقتة.\n- إدارة السمعة: استخدمت الشفافية كأداة لاحتواء الأزمة بعد انتهائها.\n\nنصيحة الوكيل: ريادة الأعمال ليست فقط في التخطيط الجيد وقت الرخاء، بل في القدرة على اتخاذ قرارات مؤلمة وصحيحة في أوقات عدم اليقين. الأمن التقني جزء لا يتجزأ من الاستدامة الاقتصادية.";

export const SCENARIO_4_NODES: Record<NodeIdS4, Scenario4Node> = {
  N1: {
    id: "N1",
    title: "مرحلة الاستقرار",
    prompt: SCENARIO_4_CALM_OPENING,
  },
  N2: {
    id: "N2",
    title: "اتخاذ القرار تحت الضغط (المقايضات)",
    prompt: SCENARIO_4_CRISIS_ALERT,
    choices: CRISIS_CHOICES,
  },
  N3_A: {
    id: "N3_A",
    title: "تحليل التداعيات - إيقاف الخوادم وحماية البيانات",
    prompt: N3_A_CONSEQUENCE,
  },
  N3_B: {
    id: "N3_B",
    title: "تحليل التداعيات - الاستعانة بشركة أمنية",
    prompt: N3_B_CONSEQUENCE,
  },
  N3_C: {
    id: "N3_C",
    title: "تحليل التداعيات - تسريب البيانات والمخاطرة",
    prompt: N3_C_CONSEQUENCE,
  },
  N4: {
    id: "N4",
    title: "التعافي وإدارة السمعة",
    prompt: RECOVERY_PROMPT,
    choices: RECOVERY_CHOICES,
  },
  END: {
    id: "END",
    title: "إتمام سيناريو إدارة الأزمات",
    prompt: S4_END_TEXT,
  },
};

export interface CrisisDecisionPayload {
  choice: "A" | "B" | "C" | null;
  timeout: boolean;
}

export function serializeCrisisDecision(payload: CrisisDecisionPayload): string {
  return JSON.stringify({
    choice: payload.choice,
    timeout: payload.timeout,
  });
}

export function deserializeCrisisDecision(text: string): CrisisDecisionPayload | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed.choice === "A" || parsed.choice === "B" || parsed.choice === "C" || parsed.choice === null) &&
      typeof parsed.timeout === "boolean"
    ) {
      return {
        choice: parsed.choice,
        timeout: parsed.timeout,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function formatCrisisDecisionDisplay(payload: CrisisDecisionPayload): string {
  if (payload.timeout) {
    return "⏱️ انتهى الوقت المحدد (60 ثانية) دون اختيار أي بديل.";
  }
  switch (payload.choice) {
    case "A":
      return `🔴 القرار المختار: الخيار (أ) - ${CRISIS_CHOICE_A}`;
    case "B":
      return `🟡 القرار المختار: الخيار (ب) - ${CRISIS_CHOICE_B}`;
    case "C":
      return `⚠️ القرار المختار: الخيار (ج) - ${CRISIS_CHOICE_C}`;
    default:
      return "تم اتخاذ قرار الأزمة";
  }
}

export function getNextNodeS4Crisis(choice: "A" | "B" | "C" | null, timeout: boolean): NodeIdS4 {
  if (timeout || choice === "C" || choice === null) {
    return "N3_C";
  }
  if (choice === "A") {
    return "N3_A";
  }
  if (choice === "B") {
    return "N3_B";
  }
  return "N3_C";
}

export interface RecoveryDecisionPayload {
  choice: "A" | "B";
}

export function serializeRecoveryDecision(choice: "A" | "B"): string {
  return JSON.stringify({ choice });
}

export function deserializeRecoveryDecision(text: string): RecoveryDecisionPayload | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && (parsed.choice === "A" || parsed.choice === "B")) {
      return { choice: parsed.choice };
    }
    return null;
  } catch {
    return null;
  }
}

export function formatRecoveryDecisionDisplay(payload: RecoveryDecisionPayload): string {
  if (payload.choice === "A") {
    return `🛡️ خطوة التعافي: (أ) ${RECOVERY_CHOICE_A}`;
  }
  return `⚠️ خطوة التعافي: (ب) ${RECOVERY_CHOICE_B}`;
}

export function getNextNodeS4Recovery(): NodeIdS4 {
  return "END";
}

export function getScenario4Node(nodeId: string): Scenario4Node {
  const safeId = (nodeId in SCENARIO_4_NODES ? nodeId : "N1") as NodeIdS4;
  return SCENARIO_4_NODES[safeId];
}