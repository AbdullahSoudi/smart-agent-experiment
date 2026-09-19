import { MAX_STUDENT_ANSWER_LENGTH, ANSWER_TOO_LONG_ERROR } from "@/lib/validation";
import { NextResponse } from "next/server";
import { getNextNode } from "@/lib/transitions";
import { evaluateNodeAnswer } from "@/lib/server/evaluator";
import {
  getSessionById,
  recordInteraction,
  updateSessionState,
  type TurnKind,
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

    if (session.current_node !== "N4_H") {
      return NextResponse.json(
        { error: "هذه المحطة ليست جاهزة للإجابة الحالية." },
        { status: 409 }
      );
    }

    // 2. Evaluator call to distinguish support/off_topic from actual answer
    let evalResult;
    try {
      evalResult = await evaluateNodeAnswer({
        nodeId: "N4", // evaluate context against N4 learning goal
        answer: trimmedAnswer,
        options: {
          sessionId: session.id,
          scenarioVersion: session.scenario_version,
          promptVersion: session.prompt_version,
        },
      });
    } catch {
      // On technical failure at N4_H, safe retryable error without advancing
      return NextResponse.json(
        { error: "تعذر معالجة الرسالة حاليًا. حاول مرة أخرى." },
        { status: 500 }
      );
    }

    if (evalResult.intent === "support" || evalResult.intent === "off_topic") {
      const turnKind: TurnKind =
        evalResult.intent === "support"
          ? "conversational_support"
          : "off_topic";

      await recordInteraction({
        sessionId: session.id,
        scenarioId: session.current_scenario ?? (session.scenario_version === "2.0" ? 1 : null),
        nodeId: "N4_H",
        studentAnswer: trimmedAnswer,
        classification: null,
        agentFeedback: evalResult.feedback,
        nextNode: "N4_H",
        turnKind,
        decisionTimeMs: null,
      });

      return NextResponse.json({
        feedback: evalResult.feedback,
        nextNode: "N4_H",
      });
    }

    // Actual reformulation answer attempt -> deterministic unclassified transition to N5
    const nextNode = getNextNode({
      nodeId: "N4_H",
    });

    if (!nextNode) {
      return NextResponse.json(
        { error: "تعذر تحديد المحطة التالية." },
        { status: 500 }
      );
    }

    await recordInteraction({
        sessionId: session.id,
        scenarioId: session.current_scenario ?? (session.scenario_version === "2.0" ? 1 : null),
      nodeId: "N4_H",
      studentAnswer: trimmedAnswer,
      classification: null,
      agentFeedback: evalResult.feedback,
      nextNode,
      turnKind: "non_evaluated_answer",
      decisionTimeMs: null,
    });

    await updateSessionState({
      sessionId: session.id,
      currentNode: nextNode,
    });

    return NextResponse.json({
      feedback: evalResult.feedback,
      nextNode,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "تعذر إرسال الإجابة الآن. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
