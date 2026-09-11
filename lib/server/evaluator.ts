/**
 * Server-only Groq runtime evaluator for student free-text responses.
 *
 * Source of Truth:
 *   - SCENARIO_SPEC.md (Version 1.0) for learning goals & rubrics
 *   - prompts/evaluator_prompt.md (Draft v0.2)
 *   - AI_EVALUATION.md
 *   - data/n1_evaluator_approval.md
 */

import Groq from "groq-sdk";
import type { Classification } from "../transitions";

/**
 * Current development baseline version for the approved evaluator prompt.
 * Note: Formal experiment freeze occurs in T55.
 */
export const PROMPT_VERSION = "0.2";

export interface EvaluationResult {
  classification: Classification;
  feedback: string;
}

export type EvaluatedNodeId = "N1" | "N2" | "N3" | "N4" | "N4_REV" | "N5" | "N1_H" | "N3_H";

const SYSTEM_INSTRUCTION = `أنت وكيل تعليمي ذكي يساعد طالبًا جامعيًا على التدريب على اكتشاف الفرص الرقمية.

مهمتك في هذه الرسالة محدودة جدًا:

1. اقرأ هدف العقدة الحالية ومعايير التصنيف.
2. افهم إجابة الطالب دلاليًا، ولا تعتمد على التطابق الحرفي للكلمات فقط.
3. صنف الإجابة إلى قيمة واحدة فقط:
   advanced
   medium
   weak
4. اكتب تغذية راجعة عربية قصيرة وداعمة مرتبطة مباشرة بإجابة الطالب (1 إلى 3 جمل).

قواعد إلزامية:
- يجب أن يكون الإخراج مطابقًا تمامًا لمخطط JSON المحدد (classification و feedback فقط).
- لا تحدد العقدة التالية.
- لا تقترح next_node.
- لا تقدم أي درجة أو تقييم رقمي (score أو grade).
- لا تغير قواعد السيناريو.
- لا تعرض التصنيف للطالب داخل feedback.
- لا تعرض درجة رقمية.
- لا تعطِ الإجابة الجاهزة مباشرة إلا إذا كانت تعليمات العقدة الحالية تقول صراحة إنها Rescue.
- لا تستخدم معلومات خارج السياق المرسل إليك.
- إذا كانت الإجابة مختصرة لكن معناها واضح، قيّم المعنى وليس طول النص.`;

function buildN1Contents(studentAnswer: string): string {
  return `CURRENT NODE:
N1

NODE QUESTION / CONTEXT:
لديك ميزانية محدودة ولا توجد لديك فكرة مشروع محددة حتى الآن. أمامك خياران:
أ) البحث أولًا عن احتياجات ومشكلات العملاء.
ب) اختيار فكرة منتج تعجبك ثم محاولة إقناع الناس بشرائها.
أي الخيارين تختار؟ ولماذا؟

LEARNING GOAL:
أن يبدأ الطالب من احتياج أو مشكلة حقيقية لدى العملاء/السوق، لا من منتج يرغب في بيعه أولًا.

ADVANCED:
الإجابة توضح بصورة مباشرة أن نقطة البداية هي البحث عن:
- احتياج
- مشكلة
- سوق
- جمهور
- بحث
- فئة مستهدفة
مع تفسير منطقي يربط ذلك باكتشاف فرصة حقيقية.

MEDIUM:
الإجابة تختار الاتجاه المقبول أو تشير إلى البحث/السوق/العملاء، لكن التفسير محدود أو غير عميق.

WEAK:
الإجابة تبدأ من:
- المنتج
- فكرة يرغب الطالب في صنعها
- تطبيق
- البيع
دون ربط ذلك بمشكلة أو احتياج حقيقي.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN2Contents(studentAnswer: string): string {
  return `CURRENT NODE:
N2

NODE QUESTION / CONTEXT:
اكتشفت مشكلة تتعلق بصعوبة وصول بعض طلاب الجامعة إلى مصادر تعليمية مناسبة. لكن ليس كل الطلاب لديهم نفس الاحتياجات.

ما أهم المعلومات التي تحتاج لمعرفتها عن العملاء المستهدفين قبل أن تقرر وجود فرصة حقيقية؟

LEARNING GOAL:
فهم العملاء والمشكلة بعمق وعدم الاكتفاء بمجرد معرفة وجود المشكلة، بل تحليل البدائل الحالية والحلول القائمة وسلوك الفئة المستهدفة.

ADVANCED:
يذكر عدة عناصر تحليلية مثل:
- المنافسين
- البدائل
- القدرة الشرائية
- السلوك
- حجم الفئة/المشكلة
- الحلول الحالية
ويظهر أنه لا يكتفي بمعرفة وجود المشكلة.

MEDIUM:
يركز على معرفة الاحتياجات أو خصائص العميل، لكن لا يحلل بصورة كافية كيف يحل العميل المشكلة حاليًا أو ما البدائل الموجودة.

WEAK:
إجابة عامة جدًا أو لا تتناول العميل والمشكلة بصورة تسمح بتقييم وجود فرصة.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN3Contents(studentAnswer: string): string {
  return `CURRENT NODE:
N3

NODE QUESTION / CONTEXT:
اكتشفت أن بعض الطلاب يعتمدون على مجموعات التواصل الاجتماعي للبحث عن المصادر، لكنهم يواجهون مشكلات مثل صعوبة التحقق من الجودة وتشتت الروابط.

هل ترى هنا فرصة رقمية؟ وما الفجوة التي يمكن لمشروعك استغلالها؟

LEARNING GOAL:
اكتشاف الفجوة الرقمية في الحلول الحالية وربطها بنقص حقيقي لدى المستخدم بدلاً من مجرد اقتراح فكرة عامة أو مكررة.

ADVANCED:
يحدد فجوة واضحة في الحلول الحالية، مثل تنظيم/تجميع/التحقق من المصادر، ويربطها بمشكلة المستخدم.

MEDIUM:
يقدم فكرة ممكنة لكنها عامة ولا يحدد بوضوح:
- لمن؟
- ما المشكلة؟
- ما القيمة؟

WEAK:
يركز على فكرة "مبتكرة" دون تحديد النقص في الحلول الحالية أو ما يفتقده الطالب.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN4Contents(studentAnswer: string): string {
  return `CURRENT NODE:
N4

NODE QUESTION / CONTEXT:
اقترح فرصة رقمية محددة لحل هذه المشكلة، واشرح في جملة ما القيمة التي سيحصل عليها العميل منها.

LEARNING GOAL:
صياغة الفرصة الرقمية والقيمة المقدمة للعميل (المستخدم، المشكلة، الحل، القيمة).

ADVANCED:
يقترح فرصة رقمية محددة لمعالجة المشكلة ويوضح بدقة القيمة التي سيحصل عليها العميل (المستخدم، المشكلة، الحل، القيمة).

MEDIUM:
يقترح فرصة أو حلاً رقمياً، لكن صياغة القيمة أو عناصر الفكرة (المستخدم، المشكلة، الحل) تحتاج إلى مزيد من التحديد.

WEAK:
الفكرة عامة جداً أو غير محددة، ولا توضح المستخدم أو المشكلة أو الحل أو القيمة.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN4RevContents(studentAnswer: string): string {
  return `CURRENT NODE:
N4_REV

NODE QUESTION / CONTEXT:
فكرتك تعالج مشكلة الوصول والتنظيم. لكن رائد الأعمال يبحث أيضًا عن الاستدامة المالية والتمكين الاقتصادي.

كيف يمكن لهذه الفرصة أن تولد عائدًا ماديًا لك؟ ولماذا تعتقد أنها تستحق التطوير؟

LEARNING GOAL:
تحديد آلية توليد العائد المالي والاستدامة الاقتصادية وتبرير جدوى تطوير الفرصة.

ADVANCED:
يقترح آلية دخل واضحة ومناسبة للفكرة ويبرر جدوى التطوير.

MEDIUM:
يذكر آلية دخل أو تبريرًا معقولًا لكن بصورة غير مكتملة.

WEAK:
لا يقدم تصورًا واقعيًا للدخل أو لا يربط العائد بالفرصة.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN5Contents(studentAnswer: string): string {
  return `CURRENT NODE:
N5

NODE QUESTION / CONTEXT:
أمامك الآن مشروعك المقترح.

ما الأسباب التي تجعلك تختار هذه الفرصة تحديدًا؟ اذكر عاملين على الأقل، منها ما يخص العملاء ومنها ما يخص العائد.

LEARNING GOAL:
تبرير اختيار الفرصة بالربط بين احتياج حقيقي للعميل (مشكلة/فئة/قيمة) وتحقيق عائد مادي ونموذج دخل مستدام.

ADVANCED:
يبرر الاختيار من خلال عناصر مثل:
- مشكلة/احتياج حقيقي
- فئة مستهدفة واضحة
- قيمة
- عائد مادي أو نموذج دخل
ويظهر ربطًا بين احتياج العميل والقيمة الاقتصادية.

MEDIUM:
التبرير جيد جزئيًا، لكنه يحتاج توضيح أن الاختيار لا يقوم فقط على إعجاب الطالب بالفكرة بل على حل مشكلة وقابلية التحول إلى قيمة اقتصادية.

WEAK:
تبرير ضعيف أو ذاتي لا يعتمد على العميل والجدوى الاقتصادية.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN1HContents(studentAnswer: string): string {
  return `CURRENT NODE:
N1_H

NODE QUESTION / CONTEXT:
تخيل أنك لاحظت أن كثيرًا من طلاب الجامعة يجدون صعوبة في العثور على مصادر تعليمية موثوقة لمقرراتهم.

هل يمكن أن تمثل هذه المشكلة نقطة بداية لاكتشاف فرصة رقمية؟ ولماذا؟

LEARNING GOAL:
التعرف على أن المشكلة أو الاحتياج الحقيقي لدى فئة محددة هو نقطة البداية لاكتشاف الفرصة الرقمية.

ADVANCED:
يتعرف بوضوح على أن وجود مشكلة حقيقية لدى فئة محددة يمكن أن يمثل نقطة بداية لفرصة رقمية، ويشرح السبب.

MEDIUM:
يوافق بصورة صحيحة ويقدم تفسيرًا بسيطًا.

WEAK:
لا يربط المشكلة باكتشاف فرصة أو يعود مرة أخرى للبدء بمنتج دون فهم المشكلة.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

function buildN3HContents(studentAnswer: string): string {
  return `CURRENT NODE:
N3_H

NODE QUESTION / CONTEXT:
فكرتك ممكنة، لكنها ما زالت عامة.

أعد صياغة الفجوة في إجابة قصيرة توضح:

- لمن هذه الفرصة؟
- ما المشكلة المحددة؟
- ما القيمة التي يمكن أن يقدمها الحل؟

LEARNING GOAL:
إعادة صياغة الفجوة الرقمية بتحديد الفئة المستهدفة والمشكلة المحددة والقيمة بوضوح كافٍ للانتقال إلى صياغة الفرصة.

ADVANCED:
يحدد بوضوح واكتمال: الفئة المستهدفة + المشكلة المحددة + القيمة التي يقدمها الحل، بما يكفي تمامًا للانتقال لصياغة الفرصة.

MEDIUM:
يحدد العناصر المطلوبة (الفئة والمشكلة والقيمة) بصورة مقبولة وكافية للانتقال لصياغة الفرصة، مع وجود إيجاز أو عمومية جزئية.

WEAK:
يظل عامًا ولا يحدد الفجوة، أو يغفل العناصر الأساسية (الفئة، المشكلة، القيمة).

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;
}

async function callGroqEvaluator(contents: string): Promise<EvaluationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Configuration Error: GROQ_API_KEY environment variable is missing.");
  }

  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";
  const groq = new Groq({ apiKey });

  let responseText: string | undefined | null;
  try {
    const chatCompletion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: contents },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "evaluation_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classification: {
                type: "string",
                enum: ["advanced", "medium", "weak"],
              },
              feedback: {
                type: "string",
              },
            },
            required: ["classification", "feedback"],
            additionalProperties: false,
          },
        },
      },
    });

    responseText = chatCompletion.choices[0]?.message?.content;
  } catch (error) {
    throw new Error(
      `Technical API Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!responseText || !responseText.trim()) {
    throw new Error("Technical Error: Model response text is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(
      `Technical Error: Failed to parse model response as JSON. ${
        parseError instanceof Error ? parseError.message : String(parseError)
      }`
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Technical Error: Model response is not a JSON object.");
  }

  const candidate = parsed as Record<string, unknown>;
  const keys = Object.keys(candidate);
  const expectedKeys = ["classification", "feedback"];
  const hasExactKeys =
    keys.length === 2 &&
    keys.includes("classification") &&
    keys.includes("feedback");

  if (!hasExactKeys) {
    throw new Error(
      `Technical Error: Invalid keys in model response. Expected exactly ['classification', 'feedback'], received: [${keys
        .map((k) => `'${k}'`)
        .join(", ")}].`
    );
  }

  const allowedClassifications: Classification[] = ["advanced", "medium", "weak"];
  if (
    typeof candidate.classification !== "string" ||
    !allowedClassifications.includes(candidate.classification as Classification)
  ) {
    throw new Error(
      `Technical Error: Invalid classification value: ${JSON.stringify(
        candidate.classification
      )}. Must be one of: advanced, medium, weak.`
    );
  }

  if (
    typeof candidate.feedback !== "string" ||
    candidate.feedback.trim().length === 0
  ) {
    throw new Error("Technical Error: Feedback must be a non-empty string.");
  }

  return {
    classification: candidate.classification as Classification,
    feedback: candidate.feedback.trim(),
  };
}

/**
 * Conceptual node evaluator that accepts nodeId and studentAnswer.
 */
export async function evaluateNodeAnswer({
  nodeId,
  answer,
}: {
  nodeId: EvaluatedNodeId;
  answer: string;
}): Promise<EvaluationResult> {
  const trimmed = answer ? answer.trim() : "";
  if (!trimmed) {
    throw new Error("Validation Error: Student answer cannot be empty.");
  }

  let contents: string;
  if (nodeId === "N1") {
    contents = buildN1Contents(trimmed);
  } else if (nodeId === "N2") {
    contents = buildN2Contents(trimmed);
  } else if (nodeId === "N3") {
    contents = buildN3Contents(trimmed);
  } else if (nodeId === "N4") {
    contents = buildN4Contents(trimmed);
  } else if (nodeId === "N4_REV") {
    contents = buildN4RevContents(trimmed);
  } else if (nodeId === "N5") {
    contents = buildN5Contents(trimmed);
  } else if (nodeId === "N1_H") {
    contents = buildN1HContents(trimmed);
  } else if (nodeId === "N3_H") {
    contents = buildN3HContents(trimmed);
  } else {
    throw new Error(`Unsupported node for evaluation: ${nodeId}`);
  }

  return callGroqEvaluator(contents);
}

/**
 * Evaluates a student's answer for node N1 using the approved Groq model and strict JSON Schema.
 * Preserved for direct backwards compatibility.
 */
export async function evaluateN1(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N1", answer: studentAnswer });
}

/**
 * Evaluates a student's answer for node N2 using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN2(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N2", answer: studentAnswer });
}

/**
 * Evaluates a student's answer for node N3 using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN3(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N3", answer: studentAnswer });
}

/**
 * Evaluates a student's answer for node N4 using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN4(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N4", answer: studentAnswer });
}

/**
 * Evaluates a student's answer for node N4_REV using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN4Rev(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N4_REV", answer: studentAnswer });
}

/**
 * Evaluates a student's answer for node N5 using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN5(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N5", answer: studentAnswer });
}

/**
 * Evaluates a student's answer for node N1_H using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN1H(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N1_H", answer: studentAnswer });
}

/**
 * Evaluates student answer for node N3_H using the approved Groq model and strict JSON Schema.
 */
export async function evaluateN3H(studentAnswer: string): Promise<EvaluationResult> {
  return evaluateNodeAnswer({ nodeId: "N3_H", answer: studentAnswer });
}
