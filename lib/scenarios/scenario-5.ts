/**
 * Scenario 5 Data Model, Canonical Prompts & Deterministic Transitions
 *
 * Source of Truth: research/scenarios/scenario-5.md
 * Skill Title: التسويق الرقمي واتخاذ القرارات المبنية على البيانات
 * Scenario ID: S5
 * Sequential Position: 5 of 5 (Final Scenario)
 * Primary Interaction Mode: A/B testing analytical simulation (محاكاة تحليلية تفاعلية)
 *
 * INVARIANTS:
 * - All researcher canonical texts and numbers are verbatim.
 * - Digital marketing budget = $1000 total, $100 test per campaign, $800 remaining.
 * - Campaign A: 1000 clicks/visits, 5 buyers (CPA = $20).
 * - Campaign B: 200 clicks/visits, 20 buyers (CPA = $5).
 * - Deterministic application-owned routing based on explicit campaign choice.
 * - S5 END marks overall experiment completion.
 */

export type NodeIdS5 =
  | "N1"
  | "N2"
  | "N3_A"
  | "N3_B"
  | "N3_C"
  | "N4"
  | "END";

export interface Scenario5Node {
  id: NodeIdS5;
  title: string;
  prompt: string;
}

export const SCENARIO_5_START_NODE_ID: NodeIdS5 = "N1";

// 1. Scenario 5 Canonical Opening (N1)
export const SCENARIO_5_CANONICAL_OPENING =
  "مشروعك يعمل الآن بكفاءة، ونجحنا في تخطي الأزمات التقنية. حان الوقت لجذب العملاء وتنمية المبيعات. لديك ميزانية تسويقية قدرها 1000 دولار، لكننا لن ننفقها دفعة واحدة.\n\nفي التسويق الرقمي، نعتمد أسلوب (A/B Testing)؛ حيث نطلق حملتين تجريبيتين بميزانية صغيرة (100 دولار لكل منهما) لنختبر أي رسالة ستجذب العملاء المستهدفين بشكل أفضل.\n\nمهمتك الأولى: حدد عنوانين مختلفين لإعلانك لتجربتهما (مثال: أحدهما يركز على \"السعر والخصم\"، والآخر يركز على \"جودة الخدمة وتوفير الوقت\").";

// 2. Dashboard Prompt with Fixed Metrics (N2)
export const N2_DASHBOARD_PROMPT =
  "هذه نتائج الحملتين بعد إنفاق 100 دولار على كل منهما:\n\n**الحملة (A) - التركيز على السعر:**\n- عدد النقرات (الزيارات): 1000 زيارة\n- العملاء الفعليون (الذين اشتروا): 5 عملاء\n\n**الحملة (B) - التركيز على الجودة:**\n- عدد النقرات (الزيارات): 200 زيارة فقط\n- العملاء الفعليون (الذين اشتروا): 20 عميلاً\n\nبناءً على هذه الأرقام، أي الحملتين ستوقفها، وأين ستضع باقي الميزانية؟ ولماذا؟";

// Fixed Campaign Metrics
export const CAMPAIGN_A_METRICS = {
  spend: 100,
  visits: 1000,
  buyers: 5,
  cpa: 20, // 100 / 5
} as const;

export const CAMPAIGN_B_METRICS = {
  spend: 100,
  visits: 200,
  buyers: 20,
  cpa: 5, // 100 / 20
} as const;

export const REMAINING_BUDGET = 800; // 1000 - 100 - 100

// 3. Feedback Branches (N3)
export const N3_B_FEEDBACK =
  "قراءة ممتازة للبيانات! لم تنخدع بعدد الزيارات الوهمية في الحملة (A). في الحملة (B)، جذبت المهتمين حقاً ودفعوا المال. لقد حققت \"تكلفة استحواذ على العميل\" (CPA) منخفضة جداً مقارنة بـ (A).";

export const N3_A_FEEDBACK =
  "انتظر قليلاً. الحملة (A) جلبت زواراً كثر، لكن كم شخصاً اشترى فعلاً؟ 5 أشخاص فقط! هذا يعني أن تكلفة العميل الواحد كلفتك 20 دولاراً. بينما الحملة (B) جلبت 20 عميلاً بتكلفة 5 دولارات للعميل. النقرات لا تدفع الفواتير، المبيعات هي من تفعل ذلك.\n\nهل تريد تغيير قرارك؟";

export const N3_C_FEEDBACK =
  "اقسم ميزانية الحملة (100 دولار) على عدد (العملاء الفعليين) في كل حملة لمعرفة تكلفة العميل الواحد. الحملة الأرخص في تكلفة العميل هي الأنجح.. أعد الحساب.";

// 4. Budget Allocation to Campaign B (N4)
export const N4_BUDGET_PROMPT =
  "الآن وقد عرفنا أن الحملة (B) هي الرابحة، لديك 800 دولار متبقية. قرارك المبني على البيانات بتوجيهها للحملة (B) سيضمن لك استثماراً ذكياً يحقق أقصى عائد مالي (ROI) للمشروع. لقد مارست دور رائد الأعمال بذكاء تحليلي.";

// 5. Final Analytical Report (S5 END)
export const S5_END_TEXT =
  "تقرير الأداء التحليلي:\n\n- قراءة البيانات: نجحت في قراءة المقاييس الحقيقية (المبيعات) وتجاهلت مقاييس الغرور (النقرات العشوائية).\n- القرارات المدفوعة بالبيانات (Data-driven): استخدمت نتائج الـ A/B Testing لتقليل المخاطرة المالية وزيادة العائد.\n\nنصيحة الوكيل: في الاقتصاد الرقمي، البيانات هي النفط الجديد. لا تتخذ قراراً تسويقياً بناءً على حدسك الشخصي، بل دع أرقام العملاء والسوق تتحدث، ثم اتبعها.";

export const SCENARIO_5_NODES: Record<NodeIdS5, Scenario5Node> = {
  N1: {
    id: "N1",
    title: "إعداد التجربة التسويقية (A/B Test)",
    prompt: SCENARIO_5_CANONICAL_OPENING,
  },
  N2: {
    id: "N2",
    title: "لوحة البيانات وقرار الحملة",
    prompt: N2_DASHBOARD_PROMPT,
  },
  N3_A: {
    id: "N3_A",
    title: "تصحيح مقاييس الغرور (Vanity Metrics)",
    prompt: N3_A_FEEDBACK,
  },
  N3_B: {
    id: "N3_B",
    title: "تحليل متقدم لتكلفة الاستحواذ",
    prompt: N3_B_FEEDBACK,
  },
  N3_C: {
    id: "N3_C",
    title: "إرشاد حساب تكلفة العميل",
    prompt: N3_C_FEEDBACK,
  },
  N4: {
    id: "N4",
    title: "توجيه الميزانية والعائد على الاستثمار",
    prompt: N4_BUDGET_PROMPT,
  },
  END: {
    id: "END",
    title: "إتمام سيناريو التسويق الرقمي والتجربة ككل",
    prompt: S5_END_TEXT,
  },
};

export interface Scenario5HeadlinesPayload {
  headlineA: string;
  headlineB: string;
}

export function serializeHeadlines(payload: Scenario5HeadlinesPayload): string {
  return JSON.stringify({
    headlineA: payload.headlineA.trim(),
    headlineB: payload.headlineB.trim(),
  });
}

export function deserializeHeadlines(text: string): Scenario5HeadlinesPayload | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.headlineA === "string" &&
      typeof parsed.headlineB === "string" &&
      parsed.headlineA.trim().length > 0 &&
      parsed.headlineB.trim().length > 0
    ) {
      return {
        headlineA: parsed.headlineA.trim(),
        headlineB: parsed.headlineB.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function formatHeadlinesDisplay(payload: Scenario5HeadlinesPayload): string {
  return [
    "📢 إعداد حملة اختبار الأداء (A/B Testing):",
    `• الحملة (A): "${payload.headlineA}"`,
    `• الحملة (B): "${payload.headlineB}"`,
  ].join("\n");
}

export type CampaignDecisionChoice = "choose_b" | "choose_a" | "unable";

export interface Scenario5DecisionPayload {
  selectedChoice: CampaignDecisionChoice;
  reasoning: string;
  confirmedChange?: boolean;
}

export function serializeCampaignDecision(payload: Scenario5DecisionPayload): string {
  return JSON.stringify({
    selectedChoice: payload.selectedChoice,
    reasoning: payload.reasoning.trim(),
    confirmedChange: payload.confirmedChange ?? false,
  });
}

export function deserializeCampaignDecision(text: string): Scenario5DecisionPayload | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed.selectedChoice === "choose_b" ||
        parsed.selectedChoice === "choose_a" ||
        parsed.selectedChoice === "unable") &&
      typeof parsed.reasoning === "string"
    ) {
      return {
        selectedChoice: parsed.selectedChoice,
        reasoning: parsed.reasoning.trim(),
        confirmedChange: Boolean(parsed.confirmedChange),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function formatCampaignDecisionDisplay(payload: Scenario5DecisionPayload): string {
  let choiceLabel = "";
  if (payload.selectedChoice === "choose_b") {
    choiceLabel = "إيقاف الحملة (A) وتوجيه باقي الميزانية (800$) للحملة (B)";
  } else if (payload.selectedChoice === "choose_a") {
    choiceLabel = "إيقاف الحملة (B) والتركيز على الحملة (A) لجذب الزيارات";
  } else {
    choiceLabel = "طلب مساعدة في تحليل الأرقام وحساب تكلفة العميل";
  }

  const lines = [`📊 القرار التسويقي: ${choiceLabel}`];
  if (payload.reasoning) {
    lines.push(`• التبرير: ${payload.reasoning}`);
  }
  return lines.join("\n");
}

export function getNextNodeS5Decision(choice: CampaignDecisionChoice): NodeIdS5 {
  switch (choice) {
    case "choose_b":
      return "N3_B";
    case "choose_a":
      return "N3_A";
    case "unable":
      return "N3_C";
    default:
      return "N3_C";
  }
}

export function getScenario5Node(nodeId: string): Scenario5Node {
  const safeId = (nodeId in SCENARIO_5_NODES ? nodeId : "N1") as NodeIdS5;
  return SCENARIO_5_NODES[safeId];
}