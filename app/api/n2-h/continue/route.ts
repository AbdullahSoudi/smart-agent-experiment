import { NextResponse } from "next/server";
import { getNextNode } from "@/lib/transitions";
import {
  getSessionById,
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

    if (session.current_node !== "N2_H") {
      return NextResponse.json(
        { error: "هذه المحطة ليست جاهزة للإجراء الحالي." },
        { status: 409 }
      );
    }

    // 2. Deterministic routing (No Groq, No classification)
    const nextNode = getNextNode({
      nodeId: "N2_H",
    });

    if (!nextNode) {
      return NextResponse.json(
        { error: "تعذر تحديد المحطة التالية." },
        { status: 500 }
      );
    }

    // 3. Update session current_node (No interaction row is created for non-interactive scaffolding)
    await updateSessionState({
      sessionId: session.id,
      currentNode: nextNode,
    });

    // 4. Return response to browser
    return NextResponse.json({
      nextNode,
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر المتابعة حاليًا. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
