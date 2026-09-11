import { NextResponse } from "next/server";
import { getNextNode } from "@/lib/transitions";
import {
  getSessionById,
  recordInteraction,
  updateSessionState,
} from "@/lib/server/persistence";

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
      !("sessionId" in body) ||
      !("answer" in body)
    ) {
      return NextResponse.json(
        { error: "البيانات المطلوبة غير مكتملة." },
        { status: 400 }
      );
    }

    const { sessionId, answer } = body as Record<string, unknown>;

    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return NextResponse.json(
        { error: "معرف الجلسة غير صالح." },
        { status: 400 }
      );
    }

    if (typeof answer !== "string" || !answer.trim()) {
      return NextResponse.json(
        { error: "يرجى كتابة إجابة للمتابعة." },
        { status: 400 }
      );
    }

    const trimmedSessionId = sessionId.trim();
    const trimmedAnswer = answer.trim();

    // 1. Server-side session verification
    const session = await getSessionById(trimmedSessionId);
    if (!session) {
      return NextResponse.json(
        { error: "الجلسة غير موجودة." },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "الجلسة غير نشطة." },
        { status: 409 }
      );
    }

    if (session.current_node !== "N4_H") {
      return NextResponse.json(
        { error: "هذه المحطة ليست جاهزة للإجابة الحالية." },
        { status: 409 }
      );
    }

    // 2. Deterministic routing (No Groq evaluation, No classification)
    const nextNode = getNextNode({
      nodeId: "N4_H",
    });

    if (!nextNode) {
      return NextResponse.json(
        { error: "تعذر تحديد المحطة التالية." },
        { status: 500 }
      );
    }

    // 3. Persist interaction (Order: interaction -> session update)
    await recordInteraction({
      sessionId: session.id,
      nodeId: "N4_H",
      studentAnswer: trimmedAnswer,
      classification: null,
      agentFeedback: null,
      nextNode,
      decisionTimeMs: null,
    });

    // 4. Update session current_node
    await updateSessionState({
      sessionId: session.id,
      currentNode: nextNode,
    });

    // 5. Return response to browser (No classification, no score)
    return NextResponse.json({
      feedback: null,
      nextNode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "تعذر إرسال الإجابة الآن. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
