import { NextResponse } from "next/server";
import { START_NODE_ID, SCENARIO_VERSION } from "@/lib/scenario";
import { PROMPT_VERSION } from "@/lib/server/evaluator";
import { createSession } from "@/lib/server/persistence";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "طلب غير صالح: تنسيق البيانات غير صحيح." },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("studentCode" in body) ||
      typeof (body as Record<string, unknown>).studentCode !== "string"
    ) {
      return NextResponse.json(
        { error: "يرجى إدخال كود الطالب للمتابعة." },
        { status: 400 }
      );
    }

    const trimmedCode = (body as { studentCode: string }).studentCode.trim();
    if (!trimmedCode) {
      return NextResponse.json(
        { error: "يرجى إدخال كود الطالب للمتابعة." },
        { status: 400 }
      );
    }

    const provider = process.env.AI_PROVIDER || "groq";
    const modelId = process.env.AI_MODEL || "openai/gpt-oss-120b";

    const session = await createSession({
      studentCode: trimmedCode,
      status: "active",
      currentNode: START_NODE_ID,
      scenarioVersion: SCENARIO_VERSION,
      promptVersion: PROMPT_VERSION,
      provider,
      modelId,
    });

    return NextResponse.json({
      sessionId: session.id,
      currentNode: session.current_node,
    });
  } catch (error) {
    // Return clean user-facing error without leaking internal details or credentials
    return NextResponse.json(
      { error: "تعذر بدء الجلسة. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
