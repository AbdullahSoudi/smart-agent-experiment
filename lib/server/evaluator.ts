/**
 * Evaluator Service for Conversational Intelligent Mentor Experiment
 *
 * Source of Truth: AI_EVALUATION.md, SCENARIO_SPEC.md & PILOT_ISSUES.md
 * Provider: Groq
 * Model: openai/gpt-oss-120b
 * Versions:
 *   - 0.2: Historical baseline (strict classification + feedback only)
 *   - 0.3: Intent-aware conversational mentor (support, off_topic, answer, progressive scaffolding, Egyptian adaptation)
 *
 * INVARIANTS:
 *   - Output is strictly validated against JSON schema
 *   - AI evaluates intent, classification, and student-visible feedback
 *   - AI NEVER chooses next_node, grade, or score
 *   - If intent === "answer": classification MUST be advanced | medium | weak
 *   - If intent === "support" | "off_topic": classification MUST be null
 *   - Invalid output combinations are technical failures (no fallback to weak, no state advancement)
 */

import Groq from "groq-sdk";
import type { EvaluatedNodeId } from "../scenario";
import { getScenarioNode } from "../scenario";
import type { Classification } from "../transitions";
import { getSupportTurnCount, getRecentInteractionsForSession, type TurnKind } from "./persistence";

export const PROMPT_VERSION = "0.3";
export const DEFAULT_PROMPT_VERSION = "0.3";

export type EvaluationIntent = "answer" | "support" | "off_topic";

export interface EvaluationResult {
  intent: EvaluationIntent;
  classification: Classification | null;
  feedback: string;
}

export interface EvaluateNodeOptions {
  sessionId?: string;
  scenarioVersion?: string;
  promptVersion?: string;
}

const SYSTEM_INSTRUCTION_V0_3 = `أنت "الوكيل الذكي لاكتشاف الفرص الرقمية"، مرشد حواري تعليمي ذكي وودود يساعد طالبًا جامعيًا في رحلة استكشاف وتطوير فرصة لمشروع ريادي رقمي.

مهمتك في كل رسالة يرسلها الطالب:
1. تحديد نية الطالب بدقة (intent):
   - "support": الطالب يطلب مساعدة، أو توضيحًا، أو تبسيطًا للسؤال، أو مثالاً، أو يسأل عن معنى كلمة أو مصطلح، أو يطلب التحدث بالمصري ("مش فاهم", "وضحلي أكتر", "ممكن تبسط السؤال؟", "يعني إيه فجوة؟", "اديني مثال", "ممكن تتكلم معايا مصري عشان أفهم؟", "مش فاهم المقصود بالقيمة", "قول السؤال بطريقة أسهل").
     * في هذه الحالة: intent = "support"، و classification = "null".
     * اكتب ردًا حواريًا مساعدًا ومبسطًا ومشجعًا في 1 إلى 3 جمل قصيرة، مع الالتزام بمستوى التدرج المطلوب (Scaffolding).

   - "off_topic": رسالة اجتماعية أو خارج سياق التعلم ("عامل ايه؟", "الجو حر النهارده", "نتكلم في حاجة تانية؟").
     * في هذه الحالة: intent = "off_topic"، و classification = "null".
     * رد باختصار ولطف (جملة واحدة)، ثم أعد توجيهه بلطف إلى السؤال الحالي.

   - "answer": رسالة تحتوي على محاولة حقيقية للإجابة عن السؤال التعليمي للمحطة، حتى لو كانت ناقصة أو غير مكتملة أو بدأها بقوله "مش فاهم أوي بس أعتقد...".
     * في هذه الحالة: intent = "answer".
     * صنف المحاولة وفق معايير المحطة بدقة: "advanced" أو "medium" أو "weak".
     * اكتب تعقيبًا توجيهيًا مشجعًا ومحددًا في 1 إلى 3 جمل قصيرة.

2. أسلوب الحوار ولغة الرد:
   - لغة عربية بسيطة ومباشرة وواضحة وسهلة على الطلاب.
   - جمل قصيرة، فكرة واحدة في كل جملة.
   - إذا كتب الطالب بالعامية المصرية أو طلب التحدث بالمصري: رد بالعامية المصرية الطبيعية البسيطة والودودة.
   - تجنب الألفاظ الأكاديمية المعقدة، وإذا كان لابد منها فاشرحها فورًا ببساطة (مثال: "القيمة المقدمة، يعني ببساطة الفايدة اللي الطالب هياخدها").
   - ممنوع منعاً باتاً ذكر التصنيف أو عبارات مثل: "إجابتك ضعيفة"، "إجابتك متوسطة"، "إجابتك متقدمة".
   - لا تذكر درجات أو تقييمات، ولا تختر المحطة التالية (next_node).

3. قيود مخرجات JSON الصارمة:
   - إذا كان intent = "answer": يجب أن يكون classification = "advanced" أو "medium" أو "weak".
   - إذا كان intent = "support" أو "off_topic": يجب أن يكون classification = "null".
   - أي تركيبة تخالف هذا هي خطأ تقني مرفوض.`;

const SYSTEM_INSTRUCTION_V0_2 = `أنت مقيّم تربوي دقيق لنظام تعليمي قائم على حل المشكلات في ريادة الأعمال الرقمية.
مهمتك تقييم إجابة الطالب وتصنيفها بدقة تامة وموضوعية وفق معايير التقييم (Rubric) الخاصة بالمحطة المحددة.

قواعد صارمة:
1. التزم بمعايير التقييم المذكورة لكل محطة نصاً وروحاً.
2. لا تتساهل في التصنيف:
   - Advanced: الإجابة تحقق المعيار المتقدم بوضوح.
   - Medium: الإجابة مقبولة جزئياً لكنها تفتقر للعمق المطلوب أو تخلط المفاهيم.
   - Weak: الإجابة سطحية أو تقفز للحل دون فهم أو تكرر أخطاء شائعة.
3. التغذية الراجعة (Feedback):
   - باللغة العربية الفصحى البسيطة.
   - من جملة إلى 3 جمل قصيرة ومحددة وداعمة.
   - لا تذكر التصنيف إطلاقاً (ممنوع قول: إجابتك ممتازة/متوسطة/ضعيفة).
   - لا تحدد المحطة التالية ولا تعلن النتيجة.
4. الإخراج يجب أن يطابق بدقة مخطط JSON المحدد.`;

function getScaffoldingGuidance(supportCount: number): string {
  if (supportCount === 0) {
    return "- توجيه الدعم (المحاولة الأولى): أعد صياغة السؤال بطريقة أبسط وأسهل وأقرب لواقع الطالب.";
  }
  if (supportCount === 1) {
    return "- توجيه الدعم (المحاولة الثانية): اضرب مثالاً بسيطاً وقريباً من حياة الطالب يوضح الفكرة دون إعطاء الإجابة الكاملة.";
  }
  if (supportCount === 2) {
    return "- توجيه الدعم (المحاولة الثالثة): قسّم السؤال إلى خطوة صغيرة واحدة واطلب من الطالب التفكير فيها.";
  }
  return "- توجيه الدعم (محاولة متقدمة): أعطه بداية مساعدة أو قالباً بسيطاً واطلب منه إكمال الباقي.";
}

function buildEvaluationPrompt({
  nodeId,
  studentAnswer,
  scenarioVersion,
  promptVersion,
  supportCount,
  recentHistory,
}: {
  nodeId: EvaluatedNodeId;
  studentAnswer: string;
  scenarioVersion: string;
  promptVersion: string;
  supportCount: number;
  recentHistory: Array<{ student_answer: string | null; agent_feedback: string | null; turn_kind: TurnKind | null }>;
}): string {
  const node = getScenarioNode(nodeId, scenarioVersion);

  let historySnippet = "";
  if (recentHistory.length > 0) {
    historySnippet = `\nRECENT CONVERSATION CONTEXT (Bounded history):\n` +
      recentHistory
        .map((turn) => {
          const s = turn.student_answer ? `[الطالب]: ${turn.student_answer}` : "";
          const a = turn.agent_feedback ? `[المرشد]: ${turn.agent_feedback}` : "";
          return [s, a].filter(Boolean).join("\n");
        })
        .join("\n");
  }

  const scaffoldingDirective = getScaffoldingGuidance(supportCount);

  return `CURRENT NODE:
${nodeId} - ${node.title}

NODE QUESTION / CONTEXT:
${node.prompt || node.message || ""}

LEARNING GOAL & RUBRIC:
- Advanced: ${node.rubric?.advanced || node.rubric?.advancedOrMedium || "تحقيق المعيار المتقدم بدقة"}
- Medium: ${node.rubric?.medium || node.rubric?.advancedOrMedium || "تحقيق مقبول جزئياً"}
- Weak: ${node.rubric?.weak || "إجابة سطحية أو غير مرتبطة"}
${node.feedbackIntent ? `\nFEEDBACK INTENT:\n- Advanced: ${node.feedbackIntent.advanced || ""}\n- Medium: ${node.feedbackIntent.medium || ""}\n- Weak: ${node.feedbackIntent.weak || ""}` : ""}

SCAFFOLDING LEVEL FOR SUPPORT TURNS (Count at this node: ${supportCount}):
${scaffoldingDirective}
${historySnippet}

CURRENT STUDENT INPUT:
${studentAnswer.trim()}

OUTPUT INSTRUCTIONS:
- First, decide the INTENT:
  * "support": if the student asks for help, explanation, simplification, examples, asks about meaning of a word, or asks to speak in Egyptian Arabic.
  * "off_topic": if unrelated conversational chitchat.
  * "answer": if the student makes a genuine attempt to answer the question, even if partial.
- If intent is "support": classification MUST be "null", provide 1-3 short supportive sentences in simple Arabic (or simple Egyptian Arabic if student used/asked for it).
- If intent is "off_topic": classification MUST be "null", provide a polite 1-sentence reply redirecting to the question.
- If intent is "answer": classification MUST be "advanced", "medium", or "weak" based on rubric. Provide 1-3 short feedback sentences.
- Conform strictly to JSON schema.`;
}

async function callGroqEvaluator(
  promptContents: string,
  promptVersion: string
): Promise<EvaluationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Configuration Error: GROQ_API_KEY environment variable is missing.");
  }

  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";
  const groq = new Groq({ apiKey });

  if (promptVersion === "0.2") {
    // Historical 0.2 execution path
    const chatCompletion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION_V0_2 },
        { role: "user", content: promptContents },
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

    const responseText = chatCompletion.choices[0]?.message?.content;
    if (!responseText || !responseText.trim()) {
      throw new Error("Technical Error: Model response text is empty.");
    }

    const parsed = JSON.parse(responseText);
    return {
      intent: "answer",
      classification: parsed.classification as Classification,
      feedback: parsed.feedback.trim(),
    };
  }

  // Current 0.3 execution path
  let responseText: string | undefined | null;
  try {
    const chatCompletion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION_V0_3 },
        { role: "user", content: promptContents },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "conversational_evaluation_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["answer", "support", "off_topic"],
              },
              classification: {
                type: "string",
                enum: ["advanced", "medium", "weak", "null"],
              },
              feedback: {
                type: "string",
              },
            },
            required: ["intent", "classification", "feedback"],
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
  const expectedKeys = ["intent", "classification", "feedback"];
  const hasExactKeys =
    keys.length === 3 &&
    expectedKeys.every((k) => keys.includes(k));

  if (!hasExactKeys) {
    throw new Error(
      `Technical Error: Invalid keys in model response. Expected exactly ['intent', 'classification', 'feedback'], received: [${keys
        .map((k) => `'${k}'`)
        .join(", ")}].`
    );
  }

  const allowedIntents: EvaluationIntent[] = ["answer", "support", "off_topic"];
  if (
    typeof candidate.intent !== "string" ||
    !allowedIntents.includes(candidate.intent as EvaluationIntent)
  ) {
    throw new Error(
      `Technical Error: Invalid intent value: ${JSON.stringify(candidate.intent)}`
    );
  }

  const intent = candidate.intent as EvaluationIntent;
  const rawClassification = candidate.classification;

  // Local Output Invariants per Approved T54 Contract:
  // if intent = answer -> classification MUST be advanced | medium | weak
  // if intent = support | off_topic -> classification MUST be null
  let finalClassification: Classification | null = null;

  if (intent === "answer") {
    const validClasses: Classification[] = ["advanced", "medium", "weak"];
    if (
      typeof rawClassification !== "string" ||
      !validClasses.includes(rawClassification as Classification)
    ) {
      throw new Error(
        `Technical Invariant Error: For intent 'answer', classification must be 'advanced', 'medium', or 'weak'. Received: ${JSON.stringify(
          rawClassification
        )}`
      );
    }
    finalClassification = rawClassification as Classification;
  } else {
    // intent is "support" or "off_topic"
    if (rawClassification !== "null" && rawClassification !== null) {
      throw new Error(
        `Technical Invariant Error: For intent '${intent}', classification must be null. Received: ${JSON.stringify(
          rawClassification
        )}`
      );
    }
    finalClassification = null;
  }

  if (
    typeof candidate.feedback !== "string" ||
    candidate.feedback.trim().length === 0
  ) {
    throw new Error("Technical Error: Feedback must be a non-empty string.");
  }

  return {
    intent,
    classification: finalClassification,
    feedback: candidate.feedback.trim(),
  };
}

/**
 * Evaluates a student's answer for any evaluated node, with bounded context and scaffolding.
 */
export async function evaluateNodeAnswer({
  nodeId,
  answer,
  options = {},
}: {
  nodeId: EvaluatedNodeId;
  answer: string;
  options?: EvaluateNodeOptions;
}): Promise<EvaluationResult> {
  const trimmed = answer ? answer.trim() : "";
  if (!trimmed) {
    throw new Error("Validation Error: Student answer cannot be empty.");
  }

  const scenarioVersion = options.scenarioVersion || "1.1";
  const promptVersion = options.promptVersion || PROMPT_VERSION;

  let supportCount = 0;
  let recentHistory: Array<{ student_answer: string | null; agent_feedback: string | null; turn_kind: TurnKind | null }> = [];

  if (options.sessionId) {
    supportCount = await getSupportTurnCount(options.sessionId, nodeId);
    recentHistory = await getRecentInteractionsForSession(options.sessionId, 6);
  }

  const promptContents = buildEvaluationPrompt({
    nodeId,
    studentAnswer: trimmed,
    scenarioVersion,
    promptVersion,
    supportCount,
    recentHistory,
  });

  return callGroqEvaluator(promptContents, promptVersion);
}

// Convenience node-specific helpers
export async function evaluateN1(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N1", answer: studentAnswer, options });
}
export async function evaluateN2(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N2", answer: studentAnswer, options });
}
export async function evaluateN3(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N3", answer: studentAnswer, options });
}
export async function evaluateN4(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N4", answer: studentAnswer, options });
}
export async function evaluateN4Rev(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N4_REV", answer: studentAnswer, options });
}
export async function evaluateN5(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N5", answer: studentAnswer, options });
}
export async function evaluateN1H(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N1_H", answer: studentAnswer, options });
}
export async function evaluateN3H(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N3_H", answer: studentAnswer, options });
}
export async function evaluateN5H(studentAnswer: string, options?: EvaluateNodeOptions) {
  return evaluateNodeAnswer({ nodeId: "N5_H", answer: studentAnswer, options });
}
