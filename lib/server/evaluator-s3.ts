/**
 * Evaluator Service for Scenario 3 (بناء وتخطيط نموذج العمل التجاري)
 *
 * Source of Truth: research/scenarios/scenario-3.md
 * Provider: Groq
 *
 * Distinct contracts:
 * 1. evaluateScenario3Audit: Logical cross-referencing across the 5 Business Model blocks
 * 2. evaluateScenario3Reconciliation: Evaluating student's gap reconciliation adjustment
 *
 * INVARIANTS:
 * - Strict JSON Schema
 * - AI NEVER outputs next_node
 * - Code maps auditResult / resolution to deterministic branches
 * - Invalid combinations are technical errors
 */

import Groq from "groq-sdk";
import type {
  BusinessModelBlocks,
  Scenario3AuditResult,
  Scenario3Resolution,
} from "../scenarios/scenario-3";
import type { EvaluationIntent } from "./evaluator";

export interface Scenario3AuditEvaluation {
  intent: EvaluationIntent;
  auditResult: Scenario3AuditResult | null;
  feedback: string;
}

export interface Scenario3ReconciliationEvaluation {
  intent: EvaluationIntent;
  resolution: Scenario3Resolution | null;
  feedback: string;
}

const SYSTEM_INSTRUCTION_S3_AUDIT = `أنت "المدقق المعرفي لنموذج العمل التجاري" (Cognitive Auditor)، مرشد ريادي ذكي يقوم بتحليل التوافق المنطقي والاقتصادي بين كتل نموذج العمل التجاري الخمس:
1. شرائح العملاء
2. القيمة المقدمة
3. القنوات
4. مصادر الإيرادات
5. هيكل التكاليف

مهمتك في تحليل كتل الطالب:
1. تحديد نية الطالب (intent):
   - "support": الطالب يسأل عن معنى مفهوم أو يطلب توضيحاً لأحد الكتل ("مش فاهم يعني إيه مصادر الإيرادات", "وضحلي القنوات", "اديني مثال").
     * intent = "support", auditResult = "null".
     * اشرح المفهوم المطلوب ببساطة ووضوح في جملتين أو ثلاث.

   - "off_topic": رسالة خارج السياق.
     * intent = "off_topic", auditResult = "null".
     * رد باختصار وأعده لإكمال كتل نموذج العمل.

   - "answer": الطالب قدم بيانات كتل نموذج العمل التجاري.
     * intent = "answer".
     * دقق في التوافق المنطقي عبر الكتل (Cross-referencing) وصنف النتيجة بدقة كأحد القيم التالية فقط:
       - "pricing_gap": فجوة بين قدرة الشريحة الشرائية ونموذج التسعير (مثال: استهداف طلاب محدودي الدخل مع فرض اشتراكات شهرية مرتفعة).
       - "cost_gap": فجوة بين القيمة المقدمة وهيكل التكاليف (مثال: وعد بمنصة ذكاء اصطناعي وخوادم سحابية سريعة مع تحديد صفر تكاليف أو تجاهل تكلفة الخوادم).
       - "channel_gap": فجوة بين سلوك الشريحة وقناة الوصول (مثال: استهداف كبار السن أو أكاديميين تقليديين عبر إعلانات تيك توك فقط).
       - "coherent": نموذج متوازن ومتوافق منطقياً يدعم بعضه البعض دون تناقضات بارزة.
     * اكتب تعقيباً تدقيقياً حوارياً باللغة العربية يشرح الملاحظة المنطقية بلطف دون ذكر المسميات البرمجية أو التصنيف الداخلي.

2. قيود صارمة:
   - إذا كان intent = "answer": يجب أن يكون auditResult واحداً من: ["pricing_gap", "cost_gap", "channel_gap", "coherent"].
   - إذا كان intent = "support" أو "off_topic": يجب أن يكون auditResult = "null".
   - لا تذكر أسماء التصنيفات الإنجليزية في التعقيب.
   - لا تختر المحطة التالية (next_node).`;

const SYSTEM_INSTRUCTION_S3_RECONCILIATION = `أنت "المدقق المعرفي لنموذج العمل التجاري"، تقيم محاولة الطالب لإعادة ضبط وتسوية الفجوة المنطقية التي تم تنبيهه إليها في نموذج عمله التجاري.

مهمتك:
1. تحديد نية الطالب (intent):
   - "support": طلب مساعدة أو توضيح ("مش عارف أحلها إزاي", "اديني اقتراح للتسعير").
     * intent = "support", resolution = "null".
   - "off_topic": كلام خارج السياق.
     * intent = "off_topic", resolution = "null".
   - "answer": محاولة لتعديل النموذج وموازنة الفجوة.
     * intent = "answer".
     * قيم هل أجرى تعديلاً منطقياً يحل التعارض:
       - "resolved": أجرى تعديلاً منطقياً يوفق بين الكتل المتعارضة (مثلاً تحول لنموذج Freemium أو غير الشريحة، أو أدرج تكلفة الخوادم، أو اختار قناة مناسبة).
       - "unresolved": استمر التعارض أو كرر نفس الطرح دون حل التناقض.
     * اكتب تعقيباً تعليمياً داعماً (وفي حالة unresolved قدم تلميحاً وتوجيهاً مباشراً يشرح كيفية الموازنة لتجنب الإحباط وفق وثيقة السيناريو).

2. قيود:
   - إذا كان intent = "answer": resolution إما "resolved" أو "unresolved".
   - إذا كان intent = "support" أو "off_topic": resolution = "null".
   - لا تذكر أسماء الحقول البرمجية ولا تختر next_node.`;

/**
 * Evaluates the 5 Business Model blocks or a free-text support query at S3 N1
 */
export async function evaluateScenario3Audit({
  blocks,
  rawText,
}: {
  blocks?: BusinessModelBlocks;
  rawText?: string;
}): Promise<Scenario3AuditEvaluation> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("Configuration Error: GROQ_API_KEY is not set.");
  }

  let promptUserContent = "";
  if (blocks) {
    promptUserContent = `كتل نموذج العمل التجاري المقدمة من الطالب:
1. شرائح العملاء: "${blocks.customerSegments}"
2. القيمة المقدمة: "${blocks.valueProposition}"
3. القنوات: "${blocks.channels}"
4. مصادر الإيرادات: "${blocks.revenueStreams}"
5. هيكل التكاليف: "${blocks.costStructure}"

دقق في التوافق المنطقي وقيم ما إذا كانت هناك فجوة تسعير (pricing_gap)، أو فجوة تكاليف (cost_gap)، أو فجوة قنوات (channel_gap)، أو توافق منطقي (coherent).`;
  } else {
    promptUserContent = `رسالة الطالب في محطة بناء نموذج العمل التجاري:
"${(rawText || "").trim()}"

حدد نية الرسالة واكتب الرد المناسب.`;
  }

  const groq = new Groq({ apiKey });

  const chatCompletion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION_S3_AUDIT },
      { role: "user", content: promptUserContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenario3_audit_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["answer", "support", "off_topic"],
            },
            auditResult: {
              type: "string",
              enum: ["pricing_gap", "cost_gap", "channel_gap", "coherent", "null"],
            },
            feedback: {
              type: "string",
            },
          },
          required: ["intent", "auditResult", "feedback"],
          additionalProperties: false,
        },
      },
    },
  });

  const responseText = chatCompletion.choices[0]?.message?.content;
  if (!responseText || !responseText.trim()) {
    throw new Error("Technical Error: Model response text is empty.");
  }

  const parsed = JSON.parse(responseText);
  return validateScenario3AuditResult(parsed);
}

/**
 * Pure validator function for S3 Audit Result (useful for tests and runtime invariants)
 */
export function validateScenario3AuditResult(candidate: unknown): Scenario3AuditEvaluation {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    throw new Error("Technical Error: Audit result must be a JSON object.");
  }

  const obj = candidate as Record<string, unknown>;
  const keys = Object.keys(obj);
  const expectedKeys = ["intent", "auditResult", "feedback"];
  const hasExactKeys =
    keys.length === 3 && expectedKeys.every((k) => keys.includes(k));

  if (!hasExactKeys) {
    throw new Error(
      `Technical Error: Invalid keys in model response. Expected exactly ['intent', 'auditResult', 'feedback'], received: [${keys.join(", ")}].`
    );
  }

  const validIntents: EvaluationIntent[] = ["answer", "support", "off_topic"];
  if (typeof obj.intent !== "string" || !validIntents.includes(obj.intent as EvaluationIntent)) {
    throw new Error(`Technical Error: Invalid intent '${String(obj.intent)}'.`);
  }

  const intent = obj.intent as EvaluationIntent;
  const rawAudit = obj.auditResult;

  let finalAudit: Scenario3AuditResult | null = null;
  if (intent === "answer") {
    const validAudits: Scenario3AuditResult[] = [
      "pricing_gap",
      "cost_gap",
      "channel_gap",
      "coherent",
    ];
    if (typeof rawAudit !== "string" || !validAudits.includes(rawAudit as Scenario3AuditResult)) {
      throw new Error(
        `Technical Invariant Error: For intent 'answer', auditResult must be one of [${validAudits.join(", ")}]. Received: '${String(rawAudit)}'`
      );
    }
    finalAudit = rawAudit as Scenario3AuditResult;
  } else {
    if (rawAudit !== "null" && rawAudit !== null) {
      throw new Error(
        `Technical Invariant Error: For intent '${intent}', auditResult must be null. Received: '${String(rawAudit)}'`
      );
    }
    finalAudit = null;
  }

  if (typeof obj.feedback !== "string" || !obj.feedback.trim()) {
    throw new Error("Technical Error: Feedback must be a non-empty string.");
  }

  return {
    intent,
    auditResult: finalAudit,
    feedback: obj.feedback.trim(),
  };
}

/**
 * Evaluates student reconciliation attempt at S3 N2_A / N2_B / N2_C / N3
 */
export async function evaluateScenario3Reconciliation({
  answer,
  gapContext,
}: {
  answer: string;
  gapContext: string;
}): Promise<Scenario3ReconciliationEvaluation> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("Configuration Error: GROQ_API_KEY is not set.");
  }

  const promptUserContent = `سياق الفجوة المنطقية السابقة:
"${gapContext}"

إجابة أو تسوية الطالب:
"${answer.trim()}"

قيم ما إذا كان الطالب أجرى تعديلاً منطقياً يحل الفجوة (resolved) أم استمر التعارض (unresolved).`;

  const groq = new Groq({ apiKey });

  const chatCompletion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION_S3_RECONCILIATION },
      { role: "user", content: promptUserContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenario3_reconciliation_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: ["answer", "support", "off_topic"],
            },
            resolution: {
              type: "string",
              enum: ["resolved", "unresolved", "null"],
            },
            feedback: {
              type: "string",
            },
          },
          required: ["intent", "resolution", "feedback"],
          additionalProperties: false,
        },
      },
    },
  });

  const responseText = chatCompletion.choices[0]?.message?.content;
  if (!responseText || !responseText.trim()) {
    throw new Error("Technical Error: Model response text is empty.");
  }

  const parsed = JSON.parse(responseText);
  return validateScenario3ReconciliationResult(parsed);
}

/**
 * Pure validator function for S3 Reconciliation Result
 */
export function validateScenario3ReconciliationResult(
  candidate: unknown
): Scenario3ReconciliationEvaluation {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    throw new Error("Technical Error: Reconciliation result must be a JSON object.");
  }

  const obj = candidate as Record<string, unknown>;
  const keys = Object.keys(obj);
  const expectedKeys = ["intent", "resolution", "feedback"];
  const hasExactKeys =
    keys.length === 3 && expectedKeys.every((k) => keys.includes(k));

  if (!hasExactKeys) {
    throw new Error(
      `Technical Error: Invalid keys. Expected ['intent', 'resolution', 'feedback'], received: [${keys.join(", ")}].`
    );
  }

  const validIntents: EvaluationIntent[] = ["answer", "support", "off_topic"];
  if (typeof obj.intent !== "string" || !validIntents.includes(obj.intent as EvaluationIntent)) {
    throw new Error(`Technical Error: Invalid intent '${String(obj.intent)}'.`);
  }

  const intent = obj.intent as EvaluationIntent;
  const rawRes = obj.resolution;

  let finalRes: Scenario3Resolution | null = null;
  if (intent === "answer") {
    const validRes: Scenario3Resolution[] = ["resolved", "unresolved"];
    if (typeof rawRes !== "string" || !validRes.includes(rawRes as Scenario3Resolution)) {
      throw new Error(
        `Technical Invariant Error: For intent 'answer', resolution must be 'resolved' or 'unresolved'. Received: '${String(rawRes)}'`
      );
    }
    finalRes = rawRes as Scenario3Resolution;
  } else {
    if (rawRes !== "null" && rawRes !== null) {
      throw new Error(
        `Technical Invariant Error: For intent '${intent}', resolution must be null. Received: '${String(rawRes)}'`
      );
    }
    finalRes = null;
  }

  if (typeof obj.feedback !== "string" || !obj.feedback.trim()) {
    throw new Error("Technical Error: Feedback must be a non-empty string.");
  }

  return {
    intent,
    resolution: finalRes,
    feedback: obj.feedback.trim(),
  };
}