/**
 * Evaluator Service for Scenario 2 (توليد الأفكار الابتكارية)
 *
 * Source of Truth: research/scenarios/scenario-2.md & AI_EVALUATION.md
 * Provider: Groq
 * Contract: Intent-aware conversational mentor (answer | support | off_topic)
 *
 * Invariants:
 * - AI evaluates classification; code owns next_node.
 * - For N4: includes student initial idea from N1 as bounded context for evolution check.
 */

import Groq from "groq-sdk";
import type { NodeIdS2 } from "../scenarios/scenario-2";
import { getScenario2Node } from "../scenarios/scenario-2";
import type { Classification } from "../transitions";
import type { EvaluationIntent, EvaluationResult } from "./evaluator";
import { getSupabaseServerClient } from "./supabase";

const SYSTEM_INSTRUCTION_S2 = `أنت "الوكيل الذكي لتوليد الأفكار الابتكارية"، مرشد حواري تعليمي وودود يساعد رائد أعمال مبتدئاً في تحويل مشكلة إلى فكرة مشروع رقمي مبتكر، وتطويرها أمام قيود واقعية (ميزانية تسويق صفرية، ومنافس يقدم خدمة مجانية، وقابلية التوسع).

مهمتك في كل رسالة يرسلها الطالب:
1. تحديد نية الطالب بدقة (intent):
   - "support": الطالب يطلب مساعدة، أو توضيحاً، أو تبسيطاً للسؤال، أو مثالاً، أو يسأل عن معنى كلمة أو مصطلح، أو يطلب التحدث بالمصري ("مش فاهم", "وضحلي", "اديني مثال", "ممكن تقولها أبسط؟", "كلمني بالمصري").
     * في هذه الحالة: intent = "support"، و classification = "null".
     * اكتب رداً حوارياً مساعداً ومبسطاً في 1 إلى 3 جمل قصيرة.

   - "off_topic": رسالة خارج سياق التعلم ("عامل ايه؟", "الجو حر").
     * في هذه الحالة: intent = "off_topic"، و classification = "null".
     * رد باختصار ولطف (جملة واحدة)، ثم أعد توجيهه بلطف إلى السؤال الحالي.

   - "answer": رسالة تحتوي على محاولة حقيقية للإجابة عن التحدي التعليمي الحالي.
     * في هذه الحالة: intent = "answer".
     * صنف المحاولة وفق معايير المحطة: "advanced" أو "medium" أو "weak".
     * اكتب تعقيباً توجيهياً مشجعاً ومحدداً في 1 إلى 3 جمل قصيرة.

2. قيود صارمة:
   - ممنوع منعاً باتاً ذكر التصنيف أو عبارات مثل: "إجابتك ضعيفة"، "إجابتك متوسطة"، "إجابتك متقدمة".
   - لا تذكر درجات أو تقييمات، ولا تختر المحطة التالية (next_node).
   - إذا كان intent = "answer": يجب أن يكون classification = "advanced" أو "medium" أو "weak".
   - إذا كان intent = "support" أو "off_topic": يجب أن يكون classification = "null".`;

export async function evaluateScenario2Answer({
  nodeId,
  answer,
  sessionId,
}: {
  nodeId: NodeIdS2;
  answer: string;
  sessionId?: string;
}): Promise<EvaluationResult> {
  const trimmed = answer ? answer.trim() : "";
  if (!trimmed) {
    throw new Error("Validation Error: Student answer cannot be empty.");
  }

  const node = getScenario2Node(nodeId);
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("Configuration Error: GROQ_API_KEY is not set.");
  }

  let initialIdeaContext = "";
  if (nodeId === "N4" && sessionId) {
    try {
      const supabase = getSupabaseServerClient();
      const { data } = await supabase
        .from("interactions")
        .select("student_answer")
        .eq("session_id", sessionId)
        .eq("scenario_id", 2)
        .eq("node_id", "N1")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data[0]?.student_answer) {
        initialIdeaContext = `\nسياق إضافي - فكرة الطالب الأولية في N1 كانت:\n"${data[0].student_answer}"\nقارن فكرته المطورة بالفكرة الأولية لملاحظة مدى التطور.\n`;
      }
    } catch {
      // Non-blocking
    }
  }

  const promptUserContent = `المحطة الحالية في السيناريو الثاني (توليد الأفكار الابتكارية):
اسم المحطة: ${node.title}
السؤال أو التحدي المطروح:
"${node.prompt}"
${initialIdeaContext}
معايير التقييم:
- Advanced: ${node.rubric?.advanced || "استجابة مبتكرة ومكتملة العناصر"}
- Medium: ${node.rubric?.medium || "استجابة مقبولة تفتقر للعمق أو التمييز"}
- Weak: ${node.rubric?.weak || "استجابة ضعيفة أو غير واضحة"}

إجابة أو رسالة الطالب:
"${trimmed}"

قيم الرسالة والتزم بالصيغة المحددة بدقة.`;

  const groq = new Groq({ apiKey });

  const chatCompletion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION_S2 },
      { role: "user", content: promptUserContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenario2_evaluation_result",
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

  const responseText = chatCompletion.choices[0]?.message?.content;
  if (!responseText || !responseText.trim()) {
    throw new Error("Technical Error: Model response text is empty.");
  }

  const parsed = JSON.parse(responseText);

  const intent = parsed.intent as EvaluationIntent;
  const rawClassification = parsed.classification;

  let finalClassification: Classification | null = null;
  if (intent === "answer") {
    if (
      rawClassification !== "advanced" &&
      rawClassification !== "medium" &&
      rawClassification !== "weak"
    ) {
      throw new Error(
        `Technical Invariant Error: Invalid classification for answer: ${rawClassification}`
      );
    }
    finalClassification = rawClassification as Classification;
  } else {
    if (rawClassification !== "null" && rawClassification !== null) {
      throw new Error(
        `Technical Invariant Error: Classification must be null for ${intent}`
      );
    }
    finalClassification = null;
  }

  if (typeof parsed.feedback !== "string" || !parsed.feedback.trim()) {
    throw new Error("Technical Error: Feedback must be a non-empty string.");
  }

  return {
    intent,
    classification: finalClassification,
    feedback: parsed.feedback.trim(),
  };
}