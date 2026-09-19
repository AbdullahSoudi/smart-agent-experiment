import { NextResponse } from "next/server";
import {
  getSessionById,
  updateSessionState,
  recordInteraction,
} from "@/lib/server/persistence";
import {
  serializeHeadlines,
  serializeCampaignDecision,
  getNextNodeS5Decision,
  N2_DASHBOARD_PROMPT,
  N3_A_FEEDBACK,
  N3_B_FEEDBACK,
  N3_C_FEEDBACK,
  N4_BUDGET_PROMPT,
  S5_END_TEXT,
  type CampaignDecisionChoice,
} from "@/lib/scenarios/scenario-5";

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
      headlineA,
      headlineB,
      selectedChoice,
      reasoning,
    } = body as {
      sessionId?: unknown;
      action?: unknown;
      headlineA?: unknown;
      headlineB?: unknown;
      selectedChoice?: unknown;
      reasoning?: unknown;
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

    if (session.current_scenario !== 5) {
      return NextResponse.json(
        { error: "الجلسة ليست في السيناريو الخامس." },
        { status: 409 }
      );
    }

    const currentNode = session.current_node;

    // Case 1: Finalization from N4 to END
    if (action === "finalize_s5" || currentNode === "N4") {
      await updateSessionState({
        sessionId: session.id,
        currentNode: "END",
      });

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 5,
        nodeId: "N4",
        studentAnswer: "توجيه باقي الميزانية (800 دولار) للحملة (B) لتحقيق أقصى عائد مالي (ROI)",
        turnKind: "non_evaluated_answer",
        classification: null,
        agentFeedback: S5_END_TEXT,
        nextNode: "END",
      });

      return NextResponse.json({
        nextNode: "END",
        feedback: S5_END_TEXT,
      });
    }

    // Case 2: Submit Headlines at N1
    if (currentNode === "N1") {
      const hA = typeof headlineA === "string" ? headlineA.trim() : "";
      const hB = typeof headlineB === "string" ? headlineB.trim() : "";

      if (!hA || !hB) {
        return NextResponse.json(
          { error: "يجب إدخال عنوان الإعلان لكلتا الحملتين (A و B)." },
          { status: 400 }
        );
      }

      const serializedHeadlines = serializeHeadlines({ headlineA: hA, headlineB: hB });

      await updateSessionState({
        sessionId: session.id,
        currentNode: "N2",
      });

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 5,
        nodeId: "N1",
        studentAnswer: serializedHeadlines,
        turnKind: "non_evaluated_answer",
        classification: null,
        agentFeedback: N2_DASHBOARD_PROMPT,
        nextNode: "N2",
      });

      return NextResponse.json({
        nextNode: "N2",
        feedback: N2_DASHBOARD_PROMPT,
      });
    }

    // Case 3: Campaign Decision at N2
    if (currentNode === "N2") {
      const choice = selectedChoice as CampaignDecisionChoice;
      if (choice !== "choose_b" && choice !== "choose_a" && choice !== "unable") {
        return NextResponse.json(
          { error: "يجب تحديد الخيار التسويقي للحملة." },
          { status: 400 }
        );
      }

      const reasonStr = typeof reasoning === "string" ? reasoning.trim() : "";
      const nextNode = getNextNodeS5Decision(choice);

      let feedback = "";
      let classification: "advanced" | "medium" | "weak" | null = null;
      if (choice === "choose_b") {
        feedback = N3_B_FEEDBACK;
        classification = "advanced";
      } else if (choice === "choose_a") {
        feedback = N3_A_FEEDBACK;
        classification = "medium";
      } else {
        feedback = N3_C_FEEDBACK;
        classification = "weak";
      }

      await updateSessionState({
        sessionId: session.id,
        currentNode: nextNode,
      });

      await recordInteraction({
        sessionId: session.id,
        scenarioId: 5,
        nodeId: "N2",
        studentAnswer: serializeCampaignDecision({
          selectedChoice: choice,
          reasoning: reasonStr,
        }),
        turnKind: "evaluated_answer",
        classification,
        agentFeedback: feedback,
        nextNode,
      });

      return NextResponse.json({
        nextNode,
        feedback,
      });
    }

    // Case 4: Transition from N3_* to N4 (Budget Allocation)
    if (
      action === "continue_to_budget" ||
      action === "confirm_change_decision" ||
      currentNode === "N3_A" ||
      currentNode === "N3_B" ||
      currentNode === "N3_C"
    ) {
      await updateSessionState({
        sessionId: session.id,
        currentNode: "N4",
      });

      if (action === "confirm_change_decision") {
        await recordInteraction({
          sessionId: session.id,
          scenarioId: 5,
          nodeId: currentNode as any,
          studentAnswer: "نعم، أغير قراري وأختار الحملة (B) لتركيز الميزانية عليها بناءً على تكلفة العميل.",
          turnKind: "evaluated_answer",
          classification: "advanced",
          agentFeedback: N4_BUDGET_PROMPT,
          nextNode: "N4",
        });
      }

      return NextResponse.json({
        nextNode: "N4",
        prompt: N4_BUDGET_PROMPT,
      });
    }

    return NextResponse.json(
      { error: "العقدة الحالية غير مهيأة لاستقبال هذا الإجراء." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "تعذر تسجيل القرار التسويقي حالياً." },
      { status: 500 }
    );
  }
}