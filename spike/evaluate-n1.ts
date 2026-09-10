import fs from "node:fs";
import { GoogleGenAI } from "@google/genai";

// Optionally load .env.local or .env if present
for (const envFile of [".env.local", ".env"]) {
  if (fs.existsSync(envFile) && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envFile);
    } catch {
      // Ignore unreadable or malformed env files
    }
  }
}

// 1. Accept student answer from command line
const studentAnswer = process.argv[2];

// 2. Validate that the answer is not empty
if (!studentAnswer || !studentAnswer.trim()) {
  console.error("Error: Student answer is required as a command-line argument.");
  process.exit(1);
}

// 3. Read GEMINI_API_KEY from process.env
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || !apiKey.trim()) {
  console.error("Error: GEMINI_API_KEY environment variable is missing.");
  process.exit(1);
}

// 4. Read GEMINI_MODEL from process.env
const model = process.env.GEMINI_MODEL;
if (!model || !model.trim()) {
  console.error("Error: GEMINI_MODEL environment variable is missing.");
  process.exit(1);
}

// Grounded N1 prompt elements from SCENARIO_SPEC.md & prompts/gemini_evaluator_prompt.md
const systemInstruction = `أنت وكيل تعليمي ذكي يساعد طالبًا جامعيًا على التدريب على اكتشاف الفرص الرقمية.

مهمتك في هذه الرسالة محدودة جدًا:

1. اقرأ هدف العقدة الحالية ومعايير التصنيف.
2. افهم إجابة الطالب دلاليًا، ولا تعتمد على التطابق الحرفي للكلمات فقط.
3. صنف الإجابة إلى قيمة واحدة فقط:
   advanced
   medium
   weak
4. اكتب تغذية راجعة عربية قصيرة وداعمة مرتبطة مباشرة بإجابة الطالب.

قواعد إلزامية:
- لا تحدد العقدة التالية.
- لا تقترح next_node.
- لا تغير قواعد السيناريو.
- لا تعرض التصنيف للطالب داخل feedback.
- لا تعرض درجة رقمية.
- لا تعطِ الإجابة الجاهزة مباشرة إلا إذا كانت تعليمات العقدة الحالية تقول صراحة إنها Rescue.
- لا تستخدم معلومات خارج السياق المرسل إليك.
- إذا كانت الإجابة مختصرة لكن معناها واضح، قيّم المعنى وليس طول النص.`;

const contents = `CURRENT NODE:
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
- Do not mention the classification label.`;

// 5. Initialize the official Google Gen AI client
const ai = new GoogleGenAI({ apiKey });

// 6. Send the grounded N1 evaluation request & 7. Print raw response
try {
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
    },
  });

  console.log(response.text);
} catch (error) {
  // 8. Handle technical API errors with a clear error message and non-zero exit code
  console.error("Technical API Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
