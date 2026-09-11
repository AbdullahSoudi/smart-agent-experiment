import { NextResponse } from "next/server";
import { getNextNode } from "@/lib/transitions";
import { SCENARIO_NODES } from "@/lib/scenario";
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

    if (typeof body !== "object" || body === null || !("sessionId" in body)) {
      return NextResponse.json(
        { error: "البيانات المطلوبة غير مكتملة." },
        { status: 400 }
      );
    }

    const { sessionId } = body as Record<string, unknown>;

    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return NextResponse.json(
        { error: "معرف الجلسة غير صالح." },
        { status: 400 }
      );
    }

    // Accept either 'choice' or 'answer'
    const rawChoice =
      "choice" in body && typeof (body as Record<string, unknown>).choice === "string"
        ? (body as Record<string, unknown>).choice
        : "answer" in body && typeof (body as Record<string, unknown>).answer === "string"
        ? (body as Record<string, unknown>).answer
        : null;

    if (!rawChoice || typeof rawChoice !== "string" || !rawChoice.trim()) {
      return NextResponse.json(
        { error: "يرجى تحديد خيار للمتابعة." },
        { status: 400 }
      );
    }

    const trimmedChoice = rawChoice.trim();
    const n1fNode = SCENARIO_NODES.N1_F;
    const validChoices: readonly string[] =
      "choices" in n1fNode && Array.isArray(n1fNode.choices) ? n1fNode.choices : [];

    let selectedChoice: string | null = null;
    if (validChoices.includes(trimmedChoice)) {
      selectedChoice = trimmedChoice;
    } else if (trimmedChoice === "1" && validChoices.length >= 1) {
      selectedChoice = validChoices[0];
    } else if (trimmedChoice === "2" && validChoices.length >= 2) {
      selectedChoice = validChoices[1];
    }

    if (!selectedChoice) {
      return NextResponse.json(
        { error: "الخيار المحدد غير صالح." },
        { status: 400 }
      );
    }

    const trimmedSessionId = sessionId.trim();

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

    if (session.current_node !== "N1_F") {
      return NextResponse.json(
        { error: "هذه المحطة ليست جاهزة للإجابة الحالية." },
        { status: 409 }
      );
    }

    // 2. Deterministic routing (No Groq, No classification)
    const nextNode = getNextNode({
      nodeId: "N1_F",
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
      nodeId: "N1_F",
      studentAnswer: selectedChoice,
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

    // 5. Return response (No classification, no score)
    return NextResponse.json({
      feedback: null,
      nextNode,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر إرسال الإجابة الآن. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
