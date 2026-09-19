import { NextResponse } from "next/server";
import {
  getSessionById,
  updateSessionState,
} from "@/lib/server/persistence";
import { isSequentialJourneyVersion } from "@/lib/scenario";

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

    // 1. Server-side session verification
    const session = await getSessionById(trimmedSessionId);
    if (!session) {
      return NextResponse.json(
        { error: "الجلسة غير موجودة." },
        { status: 404 }
      );
    }

    // 2. Safe idempotency for duplicate completion calls
    if (
      session.status === "completed" &&
      session.current_node === "END" &&
      session.finished_at !== null
    ) {
      return NextResponse.json({
        completed: true,
      });
    }

    // 3. In sequential journey (2.0 / 2.0-dev), overall completion is ONLY allowed after Scenario 5
    if (isSequentialJourneyVersion(session.scenario_version)) {
      if (session.current_scenario !== 5 || session.current_node !== "END") {
        return NextResponse.json(
          { error: "لا يمكن إنهاء التجربة قبل إكمال جميع السيناريوهات الخمسة." },
          { status: 409 }
        );
      }
    }

    // 4. Validate session is active and at END node
    if (session.current_node !== "END" || session.status !== "active") {
      return NextResponse.json(
        { error: "هذه الجلسة ليست في حالة اكتمال جاهزة للإنهاء." },
        { status: 409 }
      );
    }

    // 5. Update session to completed state with server timestamp
    const finishedAt = new Date().toISOString();
    await updateSessionState({
      sessionId: session.id,
      status: "completed",
      currentNode: "END",
      finishedAt,
    });

    // 6. Minimal client response
    return NextResponse.json({
      completed: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "تعذر إنهاء الجلسة حاليًا. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}