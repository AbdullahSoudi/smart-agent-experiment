import { NextResponse } from "next/server";
import {
  getSessionById,
  updateSessionState,
  recordInteraction,
  advanceCrisisDecisionConditional,
  ensureCrisisStartInteraction,
  getCrisisDecisionInteraction,
} from "@/lib/server/persistence";
import {
  getNextNodeS4Crisis,
  serializeCrisisDecision,
  serializeRecoveryDecision,
  SCENARIO_4_NODES,
  RECOVERY_FEEDBACK_A,
  RECOVERY_FEEDBACK_B,
  RECOVERY_PROMPT,
  type NodeIdS4,
} from "@/lib/scenarios/scenario-4";

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

    const {
      sessionId,
      action,
      choice,
      timeout,
      recoveryChoice,
    } = body as {
      sessionId?: unknown;
      action?: unknown;
      choice?: unknown;
      timeout?: unknown;
      recoveryChoice?: unknown;
    };

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

    if (session.current_scenario !== 4) {
      return NextResponse.json(
        { error: "الجلسة ليست في السيناريو الرابع." },
        { status: 409 }
      );
    }

    const currentNode = session.current_node;

    // Case 1: Advance from Consequence (N3_A / N3_B / N3_C) to Recovery (N4)
    if (
      action === "continue_to_recovery" ||
      currentNode === "N3_A" ||
      currentNode === "N3_B" ||
      currentNode === "N3_C"
    ) {
      await updateSessionState({
        sessionId: session.id,
        currentNode: "N4",
      });

      return NextResponse.json({
        nextNode: "N4",
        prompt: RECOVERY_PROMPT,
      });
    }

    // Case 2: Recovery Decision at N4
    if (currentNode === "N4") {
      if (recoveryChoice !== "A" && recoveryChoice !== "B") {
        return NextResponse.json(
          { error: "يجب اختيار أحد بدائل التعافي (أ أو ب)." },
          { status: 400 }
        );
      }

      const feedback =
        recoveryChoice === "A" ? RECOVERY_FEEDBACK_A : RECOVERY_FEEDBACK_B;

      await updateSessionState({
        sessionId: session.id,
        currentNode: "END",
      });

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 4,
        nodeId: "N4",
        studentAnswer: serializeRecoveryDecision(recoveryChoice),
        turnKind: "non_evaluated_answer",
        classification: null,
        agentFeedback: feedback,
        nextNode: "END",
      });

      return NextResponse.json({
        nextNode: "END",
        feedback,
      });
    }

    // Case 3: Crisis Decision at N2 (or Timeout)
    if (currentNode === "N2") {
      // Timing anchor & duration calculation from authoritative server record
      const startInter = await ensureCrisisStartInteraction(session.id);
      const now = Date.now();
      const startMs = Date.parse(startInter.created_at);
      const safeStartMs = Number.isFinite(startMs) ? startMs : 0;
      const elapsedMs = Math.max(0, now - safeStartMs);

      // Server-authoritative 60-second boundary check:
      // At or after 60,000 ms, deadline has passed according to canonical 60-second boundary.
      // Do not trust client's timeout flag or client-reported elapsed time.
      const isServerTimeout = elapsedMs >= 60000 || !Number.isFinite(startMs);
      const isTimeout = Boolean(timeout) || isServerTimeout;

      let selectedChoice: "A" | "B" | "C" | null = null;
      let decisionTimeMs: number;

      if (isTimeout) {
        // Enforce deterministic worst-case timeout behavior
        selectedChoice = null;
        decisionTimeMs = Math.max(60000, elapsedMs);
      } else {
        if (choice === "A" || choice === "B" || choice === "C") {
          selectedChoice = choice;
          decisionTimeMs = Math.min(59999, Math.max(1, elapsedMs));
        } else {
          return NextResponse.json(
            { error: "يجب اختيار أحد البدائل الثلاثة (أ، ب، ج) أو حدوث انتهاء الوقت." },
            { status: 400 }
          );
        }
      }

      const nextNode: NodeIdS4 = getNextNodeS4Crisis(selectedChoice, isTimeout);
      const feedback = SCENARIO_4_NODES[nextNode].prompt;

      // Atomic compare-and-set: ONLY ONE request transitions the node from N2 to nextNode
      const wonRace = await advanceCrisisDecisionConditional(
        session.id,
        "N2",
        nextNode,
        4
      );

      if (!wonRace) {
        // Race condition / duplicate submission / late arrival
        const [existing, currentSess] = await Promise.all([
          getCrisisDecisionInteraction(session.id),
          getSessionById(session.id),
        ]);
        const resolvedNode =
          (existing?.next_node as NodeIdS4) ||
          (currentSess?.current_node as NodeIdS4) ||
          nextNode;
        const resolvedFeedback =
          existing?.agent_feedback ||
          (resolvedNode in SCENARIO_4_NODES
            ? SCENARIO_4_NODES[resolvedNode].prompt
            : feedback);

        return NextResponse.json({
          nextNode: resolvedNode,
          feedback: resolvedFeedback,
          alreadyResolved: true,
        });
      }

      // Single winner persists the final crisis decision interaction
      const studentAnswer = serializeCrisisDecision({
        choice: selectedChoice,
        timeout: isTimeout,
      });

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 4,
        nodeId: "N2",
        studentAnswer,
        turnKind: "non_evaluated_answer",
        classification: null,
        agentFeedback: feedback,
        nextNode,
        decisionTimeMs,
      });

      return NextResponse.json({
        nextNode,
        feedback,
      });
    }

    // If already past N2, return existing state safely
    const existingDecision = await getCrisisDecisionInteraction(session.id);
    if (existingDecision) {
      return NextResponse.json({
        nextNode: session.current_node,
        feedback: existingDecision.agent_feedback,
        alreadyResolved: true,
      });
    }

    return NextResponse.json(
      { error: "العقدة الحالية غير مهيأة لاستقبال هذا الإجراء." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "تعذر تسجيل قرار الأزمة حالياً." },
      { status: 500 }
    );
  }
}