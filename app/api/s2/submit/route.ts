import { NextResponse } from "next/server";
import {
  MAX_STUDENT_ANSWER_LENGTH,
  ANSWER_TOO_LONG_ERROR,
} from "@/lib/validation";
import {
  getSessionById,
  recordInteraction,
  updateSessionState,
  type TurnKind,
} from "@/lib/server/persistence";
import {
  getNextNodeS2,
  type NodeIdS2,
} from "@/lib/scenarios/scenario-2";
import { evaluateScenario2Answer } from "@/lib/server/evaluator-s2";

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

    // 1. Verify session
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

    if (session.current_scenario !== 2) {
      return NextResponse.json(
        { error: "هذه المحطة تتبع سيناريو آخر." },
        { status: 409 }
      );
    }

    const currentNodeId = (session.current_node || "N1") as NodeIdS2;
    if (currentNodeId === "END") {
      return NextResponse.json(
        { error: "السيناريو الثاني مكتمل بالفعل." },
        { status: 409 }
      );
    }

    // 2. Evaluate answer
    let evaluationResult;
    try {
      evaluationResult = await evaluateScenario2Answer({
        nodeId: currentNodeId,
        answer: trimmedAnswer,
        sessionId: session.id,
      });
    } catch {
      return NextResponse.json(
        { error: "تعذر تقييم الإجابة حاليًا. حاول مرة أخرى." },
        { status: 500 }
      );
    }

    // 3. Support / Off-Topic Handling
    if (
      evaluationResult.intent === "support" ||
      evaluationResult.intent === "off_topic"
    ) {
      const turnKind: TurnKind =
        evaluationResult.intent === "support"
          ? "conversational_support"
          : "off_topic";

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 2,
        nodeId: currentNodeId,
        studentAnswer: trimmedAnswer,
        classification: null,
        agentFeedback: evaluationResult.feedback,
        nextNode: currentNodeId,
        turnKind,
        decisionTimeMs: null,
      });

      return NextResponse.json({
        feedback: evaluationResult.feedback,
        nextNode: currentNodeId,
      });
    }

    // 4. Deterministic branch transition
    if (!evaluationResult.classification) {
      return NextResponse.json(
        { error: "تعذر تقييم الإجابة حاليًا. حاول مرة أخرى." },
        { status: 500 }
      );
    }

    const nextNode = getNextNodeS2(
      currentNodeId,
      evaluationResult.classification
    );

    if (!nextNode) {
      return NextResponse.json(
        { error: "تعذر تحديد المحطة التالية." },
        { status: 500 }
      );
    }

    // 5. Persist interaction
    await recordInteraction({
      sessionId: session.id,
      scenarioId: 2,
      nodeId: currentNodeId,
      studentAnswer: trimmedAnswer,
      classification: evaluationResult.classification,
      agentFeedback: evaluationResult.feedback,
      nextNode,
      turnKind: "evaluated_answer",
      decisionTimeMs: null,
    });

    // 6. Update session state
    await updateSessionState({
      sessionId: session.id,
      currentNode: nextNode,
    });

    // 7. Minimal safe client response
    return NextResponse.json({
      feedback: evaluationResult.feedback,
      nextNode,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر إرسال الإجابة الآن. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}