/**
 * Scenario 3 Data Model, Canonical Prompts & Deterministic Transitions
 *
 * Source of Truth: research/scenarios/scenario-3.md
 * Skill Title: بناء وتخطيط نموذج العمل التجاري
 * Scenario ID: S3
 * Sequential Position: 3 of 5
 * Primary Interaction Mode: Structured input + conversational logical auditing (التدقيق المنطقي التفاعلي)
 *
 * INVARIANTS:
 * - All researcher canonical texts are verbatim.
 * - Deterministic application-owned routing.
 * - AI evaluates logical cross-audit across the five blocks; code owns next_node.
 * - Scenario 3 completion does NOT mark the overall experiment completed.
 * - Scenario 4 is NOT entered in T54.3 (temporary boundary).
 */

export type NodeIdS3 = "N1" | "N2_A" | "N2_B" | "N2_C" | "N3" | "N4" | "END";

export interface BusinessModelBlocks {
  customerSegments: string;
  valueProposition: string;
  channels: string;
  revenueStreams: string;
  costStructure: string;
}

export const BUSINESS_MODEL_LABELS = {
  customerSegments: "شرائح العملاء (من هم عملاؤك؟)",
  valueProposition: "القيمة المقدمة (ما الذي يميز خدمتك؟)",
  channels: "القنوات (كيف ستصل إليهم؟)",
  revenueStreams: "مصادر الإيرادات (كيف ستربح؟)",
  costStructure: "هيكل التكاليف (ما هي نفقاتك الأساسية؟)",
} as const;

export const SCENARIO_3_START_NODE_ID: NodeIdS3 = "N1";

export const SCENARIO_3_CANONICAL_OPENING =
  "مرحباً بك مجدداً. لقد نجحت في تحويل المشكلة إلى فكرة ابتكارية مميزة، لكن في عالم ريادة الأعمال، الأفكار الرائعة لا تنجح وحدها دون خطة عمل قابلة للتنفيذ المالي.\n\nأمامك الآن \"لوحة نموذج العمل التجاري\". لكي يصبح مشروعك حقيقة، عليك تحديد العناصر الأساسية التي سيبنى عليها.\n\nمهمتك الآن: قم بتعبئة الكتل الرئيسية التالية لمشروعك:\n\n1. شرائح العملاء (من هم عملاؤك؟)\n2. القيمة المقدمة (ما الذي يميز خدمتك؟)\n3. القنوات (كيف ستصل إليهم؟)\n4. مصادر الإيرادات (كيف ستربح؟)\n5. هيكل التكاليف (ما هي نفقاتك الأساسية؟)";

export const N2_A_PROMPT =
  "لقد اخترت \"الطلاب ذوي الدخل المحدود\" كشريحة عملاء رئيسية، لكنك حددت \"الاشتراكات الشهرية المرتفعة\" كمصدر للإيرادات.. هناك فجوة منطقية هنا! العميل المستهدف قد لا يمتلك القدرة الشرائية لنموذج الربح الخاص بك. هل نرغب في مراجعة نموذج التسعير كاستخدام نموذج Freemium أو الإعلانات أم تغيير الشريحة المستهدفة؟";

export const N2_B_PROMPT =
  "القيمة التي وعدت بها رائعة وتتطلب تقنيات متقدمة وخوادم سحابية، لكنك أشرت في هيكل التكاليف إلى عدم وجود نفقات تشغيلية! هذا التعارض قد يهدد المشروع بالتوقف في شهره الأول. كيف ستغطي هذه النفقات التقنية؟";

export const N2_C_PROMPT =
  "هل تعتقد أن \"إعلانات تيك توك\" هي القناة الأكثر فعالية للوصول إلى الشريحة الأكاديمية أو كبار السن التي استهدفتها؟ هناك تعارض بين القناة وسلوك المستخدم. ما القناة البديلة الأنسب لهم؟";

export const N4_PROMPT =
  "ممتاز! الآن الكتل تدعم بعضها البعض بشكل منطقي. الشريحة قادرة على الدفع عبر مصادر الإيرادات التي حددتها، والإيرادات تغطي هيكل التكاليف المقترح لبناء القيمة.\n\nبهذا النموذج المتوازن، يمتلك مشروعك فرصة حقيقية للنمو وتحقيق استدامة مالية وتمكين اقتصادي لك كرائد أعمال.";

export const S3_END_PROMPT =
  "لقد أتممت بنجاح تصميم نموذج العمل التجاري.\n\nخلال السيناريو، انتقلت من مرحلة سرد الأفكار المنفصلة إلى بناء نظام أعمال مترابط:\n- الترابط المنطقي: استطعت المواءمة بين شريحة عملائك ومصادر إيراداتك.\n- الوعي الاقتصادي: أظهرت فهماً للتكاليف الخفية المرتبطة بتقديم خدمة رقمية ذات قيمة.";

export interface Scenario3Node {
  id: NodeIdS3;
  title: string;
  prompt: string;
}

export const SCENARIO_3_NODES: Record<NodeIdS3, Scenario3Node> = {
  N1: {
    id: "N1",
    title: "بناء الكتل (Canvas Building)",
    prompt: SCENARIO_3_CANONICAL_OPENING,
  },
  N2_A: {
    id: "N2_A",
    title: "فجوة التسعير والقدرة الشرائية",
    prompt: N2_A_PROMPT,
  },
  N2_B: {
    id: "N2_B",
    title: "فجوة القيمة وهيكل التكاليف",
    prompt: N2_B_PROMPT,
  },
  N2_C: {
    id: "N2_C",
    title: "فجوة القنوات وطبيعة الشريحة",
    prompt: N2_C_PROMPT,
  },
  N3: {
    id: "N3",
    title: "إعادة الضبط (التسوية)",
    prompt: "حاول موازنة الكتل وتصحيح الفجوة المنطقية لتحقيق استدامة المشروع.",
  },
  N4: {
    id: "N4",
    title: "اعتماد النموذج والتمكين الاقتصادي",
    prompt: N4_PROMPT,
  },
  END: {
    id: "END",
    title: "نهاية السيناريو الثالث",
    prompt: S3_END_PROMPT,
  },
};

/**
 * Valid Canonical Audit Enums per research/scenarios/scenario-3.md
 */
export type Scenario3AuditResult =
  | "pricing_gap"
  | "cost_gap"
  | "channel_gap"
  | "coherent";

export type Scenario3Resolution = "resolved" | "unresolved";

/**
 * Helper to serialize the 5 structured blocks into a stable JSON string
 */
export function serializeBusinessModel(blocks: BusinessModelBlocks): string {
  return JSON.stringify({
    customerSegments: blocks.customerSegments.trim(),
    valueProposition: blocks.valueProposition.trim(),
    channels: blocks.channels.trim(),
    revenueStreams: blocks.revenueStreams.trim(),
    costStructure: blocks.costStructure.trim(),
  });
}

/**
 * Helper to deserialize JSON into BusinessModelBlocks, or return null if invalid
 */
export function deserializeBusinessModel(text: string): BusinessModelBlocks | null {
  try {
    const parsed = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.customerSegments === "string" &&
      typeof parsed.valueProposition === "string" &&
      typeof parsed.channels === "string" &&
      typeof parsed.revenueStreams === "string" &&
      typeof parsed.costStructure === "string"
    ) {
      return {
        customerSegments: parsed.customerSegments,
        valueProposition: parsed.valueProposition,
        channels: parsed.channels,
        revenueStreams: parsed.revenueStreams,
        costStructure: parsed.costStructure,
      };
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Checks if a stored text represents a structured Business Model submission
 */
export function isStructuredBusinessModel(text: string): boolean {
  return deserializeBusinessModel(text) !== null;
}

/**
 * Formats structured business model for human-readable Arabic display in chat
 */
export function formatBusinessModelDisplay(blocks: BusinessModelBlocks): string {
  return [
    "📋 لوحة نموذج العمل التجاري:",
    `• شرائح العملاء: ${blocks.customerSegments}`,
    `• القيمة المقترحة: ${blocks.valueProposition}`,
    `• قنوات التوزيع والوصول: ${blocks.channels}`,
    `• مصادر الإيرادات: ${blocks.revenueStreams}`,
    `• هيكل التكاليف: ${blocks.costStructure}`,
  ].join("\n");
}

/**
 * Deterministic transition function for Scenario 3 Audit (N1 -> N2-A / N2-B / N2-C / N4)
 */
export function getNextNodeS3Audit(auditResult: Scenario3AuditResult): NodeIdS3 {
  switch (auditResult) {
    case "pricing_gap":
      return "N2_A";
    case "cost_gap":
      return "N2_B";
    case "channel_gap":
      return "N2_C";
    case "coherent":
      return "N4";
    default:
      return "N4";
  }
}

/**
 * Deterministic transition function for Scenario 3 Reconciliation (N2_A/N2_B/N2_C/N3 -> N4)
 */
export function getNextNodeS3Reconciliation(resolution: Scenario3Resolution): NodeIdS3 {
  // Both resolved and unresolved advance to N4 per spec (with different feedback)
  return "N4";
}

/**
 * Returns Scenario 3 node definition by node ID
 */
export function getScenario3Node(nodeId: string): Scenario3Node {
  const safeId = (nodeId in SCENARIO_3_NODES ? nodeId : "N1") as NodeIdS3;
  return SCENARIO_3_NODES[safeId];
}