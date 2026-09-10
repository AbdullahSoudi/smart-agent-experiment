import fs from "node:fs";
import Groq from "groq-sdk";
import type { Classification, EvaluationResult } from "./types.js";

// Optionally load .env.local or .env if present
export function loadEnv(): void {
  for (const envFile of [".env.local", ".env"]) {
    if (fs.existsSync(envFile) && typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(envFile);
      } catch {
        // Ignore unreadable or malformed env files
      }
    }
  }
}

loadEnv();

// Grounded N1 prompt elements from SCENARIO_SPEC.md & prompts/evaluator_prompt.md
const systemInstruction = `أنت وكيل تعليمي ذكي يساعد طالبًا جامعيًا على التدريب على اكتشاف الفرص الرقمية.

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

function buildContents(studentAnswer: string): string {
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

export async function evaluateN1(studentAnswer: string): Promise<EvaluationResult> {
  // 1. Validate that the answer is not empty
  if (!studentAnswer || !studentAnswer.trim()) {
    throw new Error("Error: Student answer is required as a command-line argument.");
  }

  // 2. Read GROQ_API_KEY from process.env
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Error: GROQ_API_KEY environment variable is missing.");
  }

  // 3. Read AI_MODEL from process.env
  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";
  if (!model || !model.trim()) {
    throw new Error("Error: AI_MODEL environment variable is missing.");
  }

  // 4. Initialize official Groq client
  const groq = new Groq({ apiKey });
  const contents = buildContents(studentAnswer);

  // 5. Send request with native strict structured output
  let responseText: string | undefined | null;
  try {
    const chatCompletion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemInstruction },
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
    throw new Error(`Technical API Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 6. Runtime Validation
  if (!responseText || !responseText.trim()) {
    throw new Error("Technical Error: Model response text is empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(
      `Technical Error: Failed to parse model response as JSON. ${parseError instanceof Error ? parseError.message : String(parseError)}`
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Technical Error: Model response is not a JSON object.");
  }

  const keys = Object.keys(parsed);
  const expectedKeys = ["classification", "feedback"];
  const hasExactKeys =
    keys.length === 2 &&
    keys.includes("classification") &&
    keys.includes("feedback");

  if (!hasExactKeys) {
    throw new Error(
      `Technical Error: Invalid keys in model response. Expected exactly ['classification', 'feedback'], received: [${keys.map((k) => `'${k}'`).join(", ")}].`
    );
  }

  const candidate = parsed as Record<string, unknown>;

  const allowedClassifications: Classification[] = ["advanced", "medium", "weak"];
  if (
    typeof candidate.classification !== "string" ||
    !allowedClassifications.includes(candidate.classification as Classification)
  ) {
    throw new Error(
      `Technical Error: Invalid classification value: ${JSON.stringify(candidate.classification)}. Must be one of: advanced, medium, weak.`
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

// CLI entry point
const isMain =
  process.argv[1] &&
  (process.argv[1].replace(/\\/g, "/").endsWith("spike/evaluate-n1.ts") ||
    process.argv[1].replace(/\\/g, "/").endsWith("spike/evaluate-n1.js"));

if (isMain) {
  const studentAnswer = process.argv[2];
  if (!studentAnswer || !studentAnswer.trim()) {
    console.error("Error: Student answer is required as a command-line argument.");
    process.exit(1);
  }

  try {
    const result = await evaluateN1(studentAnswer);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
