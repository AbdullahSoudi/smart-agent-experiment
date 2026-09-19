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
  getNextNodeS3Audit,
  getNextNodeS3Reconciliation,
  serializeBusinessModel,
  type BusinessModelBlocks,
  type NodeIdS3,
  S3_END_PROMPT,
} from "@/lib/scenarios/scenario-3";
import {
  evaluateScenario3Audit,
  evaluateScenario3Reconciliation,
} from "@/lib/server/evaluator-s3";

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

    if (typeof body !== "object" || body === null || !("sessionId" in body)) {
      return NextResponse.json(
        { error: "البيانات المطلوبة غير مكتملة." },
        { status: 400 }
      );
    }

    const { sessionId, answer, blocks } = body as Record<string, unknown>;

    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return NextResponse.json(
        { error: "معرف الجلسة غير صالح." },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId.trim());
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

    if (session.current_scenario !== 3) {
      return NextResponse.json(
        { error: "هذه المحطة تتبع سيناريو آخر." },
        { status: 409 }
      );
    }

    const currentNodeId = (session.current_node || "N1") as NodeIdS3;
    if (currentNodeId === "END") {
      return NextResponse.json(
        { error: "السيناريو الثالث مكتمل بالفعل." },
        { status: 409 }
      );
    }

    // ----------------------------------------------------
    // Node N1: Canvas Building (Structured 5 Blocks or Support)
    // ----------------------------------------------------
    if (currentNodeId === "N1") {
      // 1. Check if structured blocks submitted
      const isBlocksSubmission =
        typeof blocks === "object" &&
        blocks !== null &&
        "customerSegments" in blocks &&
        "valueProposition" in blocks &&
        "channels" in blocks &&
        "revenueStreams" in blocks &&
        "costStructure" in blocks;

      if (isBlocksSubmission) {
        const typedBlocks = blocks as BusinessModelBlocks;
        const serialized = serializeBusinessModel(typedBlocks);

        let auditEvaluation;
        try {
          auditEvaluation = await evaluateScenario3Audit({ blocks: typedBlocks });
        } catch {
          return NextResponse.json(
            { error: "تعذر تدقيق نموذج العمل حالياً. حاول مرة أخرى." },
            { status: 500 }
          );
        }

        if (auditEvaluation.intent === "support" || auditEvaluation.intent === "off_topic") {
          const turnKind: TurnKind =
            auditEvaluation.intent === "support" ? "conversational_support" : "off_topic";

          await recordInteraction({
            sessionId: session.id,
            scenarioId: 3,
            nodeId: "N1",
            studentAnswer: serialized,
            classification: null,
            agentFeedback: auditEvaluation.feedback,
            nextNode: "N1",
            turnKind,
            decisionTimeMs: null,
          });

          return NextResponse.json({
            feedback: auditEvaluation.feedback,
            nextNode: "N1",
          });
        }

        if (!auditEvaluation.auditResult) {
          return NextResponse.json(
            { error: "تعذر تقييم التدقيق المنطقي للنموذج." },
            { status: 500 }
          );
        }

        const nextNode = getNextNodeS3Audit(auditEvaluation.auditResult);

        // Persist interaction with scenario_id = 3
        await recordInteraction({
          sessionId: session.id,
          scenarioId: 3,
          nodeId: "N1",
          studentAnswer: serialized,
          classification: null,
          agentFeedback: auditEvaluation.feedback,
          nextNode,
          turnKind: "evaluated_answer",
          decisionTimeMs: null,
        });

        await updateSessionState({
          sessionId: session.id,
          currentNode: nextNode,
        });

        return NextResponse.json({
          feedback: auditEvaluation.feedback,
          nextNode,
        });
      }

      // 2. Free-text support / question at N1
      if (typeof answer === "string" && answer.trim()) {
        const trimmed = answer.trim();
        if (trimmed.length > MAX_STUDENT_ANSWER_LENGTH) {
          return NextResponse.json(
            { error: ANSWER_TOO_LONG_ERROR },
            { status: 400 }
          );
        }

        let auditEvaluation;
        try {
          auditEvaluation = await evaluateScenario3Audit({ rawText: trimmed });
        } catch {
          return NextResponse.json(
            { error: "تعذر الرد حالياً. حاول مرة أخرى." },
            { status: 500 }
          );
        }

        const turnKind: TurnKind =
          auditEvaluation.intent === "support" ? "conversational_support" : "off_topic";

        await recordInteraction({
          sessionId: session.id,
          scenarioId: 3,
          nodeId: "N1",
          studentAnswer: trimmed,
          classification: null,
          agentFeedback: auditEvaluation.feedback,
          nextNode: "N1",
          turnKind,
          decisionTimeMs: null,
        });

        return NextResponse.json({
          feedback: auditEvaluation.feedback,
          nextNode: "N1",
        });
      }

      return NextResponse.json(
        { error: "يرجى تعبئة كتل نموذج العمل الخمس للمتابعة." },
        { status: 400 }
      );
    }

    // ----------------------------------------------------
    // Reconciliation Nodes: N2_A, N2_B, N2_C, N3
    // ----------------------------------------------------
    if (
      currentNodeId === "N2_A" ||
      currentNodeId === "N2_B" ||
      currentNodeId === "N2_C" ||
      currentNodeId === "N3"
    ) {
      if (typeof answer !== "string" || !answer.trim()) {
        return NextResponse.json(
          { error: "يرجى كتابة توضيح أو تعديل للمتابعة." },
          { status: 400 }
        );
      }

      const trimmedAnswer = answer.trim();
      if (trimmedAnswer.length > MAX_STUDENT_ANSWER_LENGTH) {
        return NextResponse.json(
          { error: ANSWER_TOO_LONG_ERROR },
          { status: 400 }
        );
      }

      let reconEval;
      try {
        reconEval = await evaluateScenario3Reconciliation({
          answer: trimmedAnswer,
          gapContext: currentNodeId,
        });
      } catch {
        return NextResponse.json(
          { error: "تعذر تقييم التعديل حالياً. حاول مرة أخرى." },
          { status: 500 }
        );
      }

      if (reconEval.intent === "support" || reconEval.intent === "off_topic") {
        const turnKind: TurnKind =
          reconEval.intent === "support" ? "conversational_support" : "off_topic";

        await recordInteraction({
          sessionId: session.id,
          scenarioId: 3,
          nodeId: currentNodeId,
          studentAnswer: trimmedAnswer,
          classification: null,
          agentFeedback: reconEval.feedback,
          nextNode: currentNodeId,
          turnKind,
          decisionTimeMs: null,
        });

        return NextResponse.json({
          feedback: reconEval.feedback,
          nextNode: currentNodeId,
        });
      }

      const nextNode = getNextNodeS3Reconciliation(reconEval.resolution || "resolved");

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 3,
        nodeId: currentNodeId,
        studentAnswer: trimmedAnswer,
        classification: null,
        agentFeedback: reconEval.feedback,
        nextNode,
        turnKind: "evaluated_answer",
        decisionTimeMs: null,
      });

      await updateSessionState({
        sessionId: session.id,
        currentNode: nextNode,
      });

      return NextResponse.json({
        feedback: reconEval.feedback,
        nextNode,
      });
    }

    // ----------------------------------------------------
    // Node N4: Model Approval -> Advances to END
    // ----------------------------------------------------
    if (currentNodeId === "N4") {
      const studentInput = typeof answer === "string" ? answer.trim() : "متابعة";

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 3,
        nodeId: "N4",
        studentAnswer: studentInput,
        classification: null,
        agentFeedback: S3_END_PROMPT,
        nextNode: "END",
        turnKind: "evaluated_answer",
        decisionTimeMs: null,
      });

      await updateSessionState({
        sessionId: session.id,
        currentNode: "END",
      });

      return NextResponse.json({
        feedback: S3_END_PROMPT,
        nextNode: "END",
      });
    }

    return NextResponse.json(
      { error: "المحطة الحالية غير صالحة للإرسال." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "تعذر معالجة الطلب حالياً. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}