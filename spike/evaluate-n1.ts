import fs from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";
import type { Classification, EvaluationResult } from "./types.js";

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
const systemInstruction = `Ø£Ù†Øª ÙˆÙƒÙŠÙ„ ØªØ¹Ù„ÙŠÙ…ÙŠ Ø°ÙƒÙŠ ÙŠØ³Ø§Ø¹Ø¯ Ø·Ø§Ù„Ø¨Ù‹Ø§ Ø¬Ø§Ù…Ø¹ÙŠÙ‹Ø§ Ø¹Ù„Ù‰ Ø§Ù„ØªØ¯Ø±ÙŠØ¨ Ø¹Ù„Ù‰ Ø§ÙƒØªØ´Ø§Ù Ø§Ù„ÙØ±Øµ Ø§Ù„Ø±Ù‚Ù…ÙŠØ©.

Ù…Ù‡Ù…ØªÙƒ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø­Ø¯ÙˆØ¯Ø© Ø¬Ø¯Ù‹Ø§:

1. Ø§Ù‚Ø±Ø£ Ù‡Ø¯Ù Ø§Ù„Ø¹Ù‚Ø¯Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙˆÙ…Ø¹Ø§ÙŠÙŠØ± Ø§Ù„ØªØµÙ†ÙŠÙ.
2. Ø§ÙÙ‡Ù… Ø¥Ø¬Ø§Ø¨Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¯Ù„Ø§Ù„ÙŠÙ‹Ø§ØŒ ÙˆÙ„Ø§ ØªØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„ØªØ·Ø§Ø¨Ù‚ Ø§Ù„Ø­Ø±ÙÙŠ Ù„Ù„ÙƒÙ„Ù…Ø§Øª ÙÙ‚Ø·.
3. ØµÙ†Ù Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¥Ù„Ù‰ Ù‚ÙŠÙ…Ø© ÙˆØ§Ø­Ø¯Ø© ÙÙ‚Ø·:
   advanced
   medium
   weak
4. Ø§ÙƒØªØ¨ ØªØºØ°ÙŠØ© Ø±Ø§Ø¬Ø¹Ø© Ø¹Ø±Ø¨ÙŠØ© Ù‚ØµÙŠØ±Ø© ÙˆØ¯Ø§Ø¹Ù…Ø© Ù…Ø±ØªØ¨Ø·Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨Ø¥Ø¬Ø§Ø¨Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ (1 Ø¥Ù„Ù‰ 3 Ø¬Ù…Ù„).

Ù‚ÙˆØ§Ø¹Ø¯ Ø¥Ù„Ø²Ø§Ù…ÙŠØ©:
- ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø§Ù„Ø¥Ø®Ø±Ø§Ø¬ Ù…Ø·Ø§Ø¨Ù‚Ù‹Ø§ ØªÙ…Ø§Ù…Ù‹Ø§ Ù„Ù…Ø®Ø·Ø· JSON Ø§Ù„Ù…Ø­Ø¯Ø¯ (classification Ùˆ feedback ÙÙ‚Ø·).
- Ù„Ø§ ØªØ­Ø¯Ø¯ Ø§Ù„Ø¹Ù‚Ø¯Ø© Ø§Ù„ØªØ§Ù„ÙŠØ©.
- Ù„Ø§ ØªÙ‚ØªØ±Ø­ next_node.
- Ù„Ø§ ØªÙ‚Ø¯Ù… Ø£ÙŠ Ø¯Ø±Ø¬Ø© Ø£Ùˆ ØªÙ‚ÙŠÙŠÙ… Ø±Ù‚Ù…ÙŠ (score Ø£Ùˆ grade).
- Ù„Ø§ ØªØºÙŠØ± Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ.
- Ù„Ø§ ØªØ¹Ø±Ø¶ Ø§Ù„ØªØµÙ†ÙŠÙ Ù„Ù„Ø·Ø§Ù„Ø¨ Ø¯Ø§Ø®Ù„ feedback.
- Ù„Ø§ ØªØ¹Ø±Ø¶ Ø¯Ø±Ø¬Ø© Ø±Ù‚Ù…ÙŠØ©.
- Ù„Ø§ ØªØ¹Ø·Ù Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø§Ù„Ø¬Ø§Ù‡Ø²Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø¥Ù„Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„Ø¹Ù‚Ø¯Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØªÙ‚ÙˆÙ„ ØµØ±Ø§Ø­Ø© Ø¥Ù†Ù‡Ø§ Rescue.
- Ù„Ø§ ØªØ³ØªØ®Ø¯Ù… Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø®Ø§Ø±Ø¬ Ø§Ù„Ø³ÙŠØ§Ù‚ Ø§Ù„Ù…Ø±Ø³Ù„ Ø¥Ù„ÙŠÙƒ.
- Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ù…Ø®ØªØµØ±Ø© Ù„ÙƒÙ† Ù…Ø¹Ù†Ø§Ù‡Ø§ ÙˆØ§Ø¶Ø­ØŒ Ù‚ÙŠÙ‘Ù… Ø§Ù„Ù…Ø¹Ù†Ù‰ ÙˆÙ„ÙŠØ³ Ø·ÙˆÙ„ Ø§Ù„Ù†Øµ.`;

const contents = `CURRENT NODE:
N1

NODE QUESTION / CONTEXT:
Ù„Ø¯ÙŠÙƒ Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ù…Ø­Ø¯ÙˆØ¯Ø© ÙˆÙ„Ø§ ØªÙˆØ¬Ø¯ Ù„Ø¯ÙŠÙƒ ÙÙƒØ±Ø© Ù…Ø´Ø±ÙˆØ¹ Ù…Ø­Ø¯Ø¯Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†. Ø£Ù…Ø§Ù…Ùƒ Ø®ÙŠØ§Ø±Ø§Ù†:
Ø£) Ø§Ù„Ø¨Ø­Ø« Ø£ÙˆÙ„Ù‹Ø§ Ø¹Ù† Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª ÙˆÙ…Ø´ÙƒÙ„Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡.
Ø¨) Ø§Ø®ØªÙŠØ§Ø± ÙÙƒØ±Ø© Ù…Ù†ØªØ¬ ØªØ¹Ø¬Ø¨Ùƒ Ø«Ù… Ù…Ø­Ø§ÙˆÙ„Ø© Ø¥Ù‚Ù†Ø§Ø¹ Ø§Ù„Ù†Ø§Ø³ Ø¨Ø´Ø±Ø§Ø¦Ù‡Ø§.
Ø£ÙŠ Ø§Ù„Ø®ÙŠØ§Ø±ÙŠÙ† ØªØ®ØªØ§Ø±ØŸ ÙˆÙ„Ù…Ø§Ø°Ø§ØŸ

LEARNING GOAL:
Ø£Ù† ÙŠØ¨Ø¯Ø£ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù…Ù† Ø§Ø­ØªÙŠØ§Ø¬ Ø£Ùˆ Ù…Ø´ÙƒÙ„Ø© Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù„Ø¯Ù‰ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡/Ø§Ù„Ø³ÙˆÙ‚ØŒ Ù„Ø§ Ù…Ù† Ù…Ù†ØªØ¬ ÙŠØ±ØºØ¨ ÙÙŠ Ø¨ÙŠØ¹Ù‡ Ø£ÙˆÙ„Ù‹Ø§.

ADVANCED:
Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© ØªÙˆØ¶Ø­ Ø¨ØµÙˆØ±Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ø£Ù† Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© Ù‡ÙŠ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù†:
- Ø§Ø­ØªÙŠØ§Ø¬
- Ù…Ø´ÙƒÙ„Ø©
- Ø³ÙˆÙ‚
- Ø¬Ù…Ù‡ÙˆØ±
- Ø¨Ø­Ø«
- ÙØ¦Ø© Ù…Ø³ØªÙ‡Ø¯ÙØ©
Ù…Ø¹ ØªÙØ³ÙŠØ± Ù…Ù†Ø·Ù‚ÙŠ ÙŠØ±Ø¨Ø· Ø°Ù„Ùƒ Ø¨Ø§ÙƒØªØ´Ø§Ù ÙØ±ØµØ© Ø­Ù‚ÙŠÙ‚ÙŠØ©.

MEDIUM:
Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© ØªØ®ØªØ§Ø± Ø§Ù„Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ù…Ù‚Ø¨ÙˆÙ„ Ø£Ùˆ ØªØ´ÙŠØ± Ø¥Ù„Ù‰ Ø§Ù„Ø¨Ø­Ø«/Ø§Ù„Ø³ÙˆÙ‚/Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ØŒ Ù„ÙƒÙ† Ø§Ù„ØªÙØ³ÙŠØ± Ù…Ø­Ø¯ÙˆØ¯ Ø£Ùˆ ØºÙŠØ± Ø¹Ù…ÙŠÙ‚.

WEAK:
Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© ØªØ¨Ø¯Ø£ Ù…Ù†:
- Ø§Ù„Ù…Ù†ØªØ¬
- ÙÙƒØ±Ø© ÙŠØ±ØºØ¨ Ø§Ù„Ø·Ø§Ù„Ø¨ ÙÙŠ ØµÙ†Ø¹Ù‡Ø§
- ØªØ·Ø¨ÙŠÙ‚
- Ø§Ù„Ø¨ÙŠØ¹
Ø¯ÙˆÙ† Ø±Ø¨Ø· Ø°Ù„Ùƒ Ø¨Ù…Ø´ÙƒÙ„Ø© Ø£Ùˆ Ø§Ø­ØªÙŠØ§Ø¬ Ø­Ù‚ÙŠÙ‚ÙŠ.

STUDENT ANSWER:
${studentAnswer.trim()}

FEEDBACK REQUIREMENTS:
- Arabic.
- 1 to 3 short sentences.
- Supportive and specific.
- Do not mention the classification label.
- Do not determine next_node or score.
- Output must conform to the JSON schema.`;

// 5. Initialize the official Google Gen AI client
const ai = new GoogleGenAI({ apiKey });

// 6. Send the grounded N1 evaluation request with native structured output
let responseText: string | undefined;
try {
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          classification: {
            type: Type.STRING,
            enum: ["advanced", "medium", "weak"],
          },
          feedback: {
            type: Type.STRING,
          },
        },
        required: ["classification", "feedback"],
      },
    },
  });

  responseText = response.text;
} catch (error) {
  // Handle technical API errors with a clear technical error message and non-zero exit code
  console.error("Technical API Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}

// 7. Runtime Validation
// 7.1 Ensure text exists
if (!responseText || !responseText.trim()) {
  console.error("Technical Error: Model response text is empty.");
  process.exit(1);
}

// 7.2 Parse it as JSON
let parsed: unknown;
try {
  parsed = JSON.parse(responseText);
} catch (parseError) {
  console.error(
    "Technical Error: Failed to parse model response as JSON.",
    parseError instanceof Error ? parseError.message : parseError
  );
  process.exit(1);
}

// 7.3 Validate that the result is an object (non-null, non-array)
if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
  console.error("Technical Error: Model response is not a JSON object.");
  process.exit(1);
}

// 7.4 Validate exact keys (reject unexpected fields)
const keys = Object.keys(parsed);
const expectedKeys = ["classification", "feedback"];
const hasExactKeys =
  keys.length === 2 &&
  keys.includes("classification") &&
  keys.includes("feedback");

if (!hasExactKeys) {
  console.error(
    `Technical Error: Invalid keys in model response. Expected exactly ['classification', 'feedback'], received: [${keys.map((k) => `'${k}'`).join(", ")}].`
  );
  process.exit(1);
}

const candidate = parsed as Record<string, unknown>;

// 7.5 Validate classification is exactly one of: advanced, medium, weak
const allowedClassifications: Classification[] = ["advanced", "medium", "weak"];
if (
  typeof candidate.classification !== "string" ||
  !allowedClassifications.includes(candidate.classification as Classification)
) {
  console.error(
    `Technical Error: Invalid classification value: ${JSON.stringify(candidate.classification)}. Must be one of: advanced, medium, weak.`
  );
  process.exit(1);
}

// 7.6 Validate feedback is a non-empty string
if (
  typeof candidate.feedback !== "string" ||
  candidate.feedback.trim().length === 0
) {
  console.error("Technical Error: Feedback must be a non-empty string.");
  process.exit(1);
}

const result: EvaluationResult = {
  classification: candidate.classification as Classification,
  feedback: candidate.feedback.trim(),
};

// 8. Output Behavior: Print only the validated JSON result on stdout
console.log(JSON.stringify(result, null, 2));
