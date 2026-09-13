import { NextResponse } from "next/server";
import {
  getSessionById,
  getInteractionsForSession,
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
      !("sessionId" in body)
    ) {
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

    const trimmedSessionId = sessionId.trim();

    const session = await getSessionById(trimmedSessionId);
    if (!session) {
      return NextResponse.json(
        { error: "الجلسة غير موجودة." },
        { status: 404 }
      );
    }

    const rawInteractions = await getInteractionsForSession(trimmedSessionId);

    // Provide sanitized history for client-side transcript reconstruction
    // Exclude classification, scores, and provider internals
    const history = rawInteractions.map((inter) => ({
      nodeId: inter.node_id,
      studentAnswer: inter.student_answer,
      feedback: inter.agent_feedback,
      nextNode: inter.next_node,
      turnKind: inter.turn_kind ?? null,
    }));

    return NextResponse.json({
      status: session.status,
      currentNode: session.current_node,
      scenarioVersion: session.scenario_version,
      history,
    });
  } catch (error) {
    console.error("Session restore error:", error);
    return NextResponse.json(
      { error: "تعذر استعادة الجلسة حاليًا. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
