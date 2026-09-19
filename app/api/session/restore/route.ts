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
    // Strictly exclude classification, scores, decision times, and provider internals
    const history = rawInteractions.map((inter) => ({
      scenarioId: inter.scenario_id ?? 1,
      nodeId: inter.node_id,
      studentAnswer: inter.student_answer,
      feedback: inter.agent_feedback,
      nextNode: inter.next_node,
      turnKind: inter.turn_kind ?? null,
    }));

    // Calculate Scenario 4 crisis timer state if applicable
    let crisisRemainingSeconds: number | null = null;
    let crisisExpired = false;
    let crisisStartedAt: string | null = null;

    if (session.current_scenario === 4) {
      const crisisStart = rawInteractions.find(
        (i) => i.scenario_id === 4 && i.node_id === "N2" && i.student_answer === "CRISIS_START"
      );
      if (crisisStart) {
        crisisStartedAt = crisisStart.created_at;
        const now = Date.now();
        const startMs = Date.parse(crisisStart.created_at);
        const elapsedSec = Math.floor(Math.max(0, now - startMs) / 1000);
        crisisRemainingSeconds = Math.max(0, 60 - elapsedSec);
        crisisExpired = crisisRemainingSeconds <= 0;
      }
    }

    return NextResponse.json({
      status: session.status,
      currentNode: session.current_node,
      scenarioVersion: session.scenario_version,
      studentName: session.student_name ?? null,
      studentCode: session.student_code,
      currentScenario: session.current_scenario ?? null,
      crisisRemainingSeconds,
      crisisExpired,
      crisisStartedAt,
      history,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر استعادة الجلسة حالياً. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}