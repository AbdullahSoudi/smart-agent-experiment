import { MAX_STUDENT_ANSWER_LENGTH, ANSWER_TOO_LONG_ERROR } from "@/lib/validation";
import { NextResponse } from "next/server";
import { getNextNode } from "@/lib/transitions";
import { evaluateN3H } from "@/lib/server/evaluator";
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

    if (trimmedAnswer.length > MAX_STUDENT_ANSWER_LENGTH) {
      return NextResponse.json(
        { error: ANSWER_TOO_LONG_ERROR },
        { status: 400 }
      );
    }

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

    if (session.current_node !== "N3_H") {
      return NextResponse.json(
        { error: "هذه المحطة ليست جاهزة للإجابة الحالية." },
        { status: 409 }
      );
    }

    // 2. Groq AI Evaluation (N3_H)
    let evaluationResult;
    try {
      evaluationResult = await evaluateN3H(trimmedAnswer);
    } catch (evalError) {
      // Technical failure rule: A technical AI failure is NOT a weak answer.
      // Do not advance node, do not persist interaction, student remains at N3_H.
      return NextResponse.json(
        { error: "تعذر تقييم الإجابة حاليًا. حاول مرة أخرى." },
        { status: 500 }
      );
    }

    // 3. Deterministic application transition logic
    const nextNode = getNextNode({
      nodeId: "N3_H",
      classification: evaluationResult.classification,
    });

    if (!nextNode) {
      return NextResponse.json(
        { error: "تعذر تحديد المحطة التالية." },
        { status: 500 }
      );
    }

    // 4. Persist interaction (Order: interaction -> session update)
    await recordInteraction({
      sessionId: session.id,
      nodeId: "N3_H",
      studentAnswer: trimmedAnswer,
      classification: evaluationResult.classification,
      agentFeedback: evaluationResult.feedback,
      nextNode,
      decisionTimeMs: null,
    });

    // 5. Update session current_node
    await updateSessionState({
      sessionId: session.id,
      currentNode: nextNode,
    });

    // 6. Return response to browser (classification strictly excluded)
    return NextResponse.json({
      feedback: evaluationResult.feedback,
      nextNode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "تعذر إرسال الإجابة الآن. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
