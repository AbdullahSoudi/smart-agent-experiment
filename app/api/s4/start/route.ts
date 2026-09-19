import { NextResponse } from "next/server";
import {
  getSessionById,
  updateSessionState,
  ensureCrisisStartInteraction,
  getCrisisDecisionInteraction,
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

    // If session is at N1 (calm opening), advance to N2 (crisis shock)
    if (session.current_node === "N1") {
      await updateSessionState({
        sessionId: session.id,
        currentNode: "N2",
      });
    }

    // Ensure idempotent crisis-start timing anchor
    const startInter = await ensureCrisisStartInteraction(session.id);
    const now = Date.now();
    const startMs = Date.parse(startInter.created_at);
    const elapsedSec = Math.floor(Math.max(0, now - startMs) / 1000);
    const remainingSeconds = Math.max(0, 60 - elapsedSec);

    // Check if crisis decision was already resolved
    const decisionInter = await getCrisisDecisionInteraction(session.id);

    return NextResponse.json({
      currentNode: session.current_node === "N1" ? "N2" : session.current_node,
      remainingSeconds,
      crisisStartedAt: startInter.created_at,
      expired: remainingSeconds <= 0,
      alreadyResolved: Boolean(decisionInter),
      resolvedNextNode: decisionInter?.next_node ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر بدء محاكاة الأزمة." },
      { status: 500 }
    );
  }
}