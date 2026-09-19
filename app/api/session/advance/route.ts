import { NextResponse } from "next/server";
import {
  getSessionById,
  updateSessionState,
} from "@/lib/server/persistence";
import { SCENARIO_2_START_NODE_ID } from "@/lib/scenarios/scenario-2";
import { SCENARIO_3_START_NODE_ID } from "@/lib/scenarios/scenario-3";
import { SCENARIO_4_START_NODE_ID } from "@/lib/scenarios/scenario-4";
import { SCENARIO_5_START_NODE_ID } from "@/lib/scenarios/scenario-5";

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

    // Only applicable to sequential 2.0 journey
    if (session.scenario_version !== "2.0") {
      return NextResponse.json(
        { error: "هذه الجلسة تتبع نموذج النسخ التاريخية ولا تدعم الانتقال المتسلسل." },
        { status: 400 }
      );
    }

    const currentScenario = session.current_scenario || 1;
    const currentNode = session.current_node;

    // Idempotency check: If already at scenario 2, 3, 4, or 5 and not at END of that scenario
    if (currentScenario === 2 && currentNode !== "END") {
      return NextResponse.json({
        currentScenario: 2,
        currentNode,
        state: "already_advanced",
      });
    }

    if (currentScenario === 3 && currentNode !== "END") {
      return NextResponse.json({
        currentScenario: 3,
        currentNode,
        state: "already_advanced",
      });
    }

    if (currentScenario === 4 && currentNode !== "END") {
      return NextResponse.json({
        currentScenario: 4,
        currentNode,
        state: "already_advanced",
      });
    }

    if (currentScenario === 5 && currentNode !== "END") {
      return NextResponse.json({
        currentScenario: 5,
        currentNode,
        state: "already_advanced",
      });
    }

    // S1 END -> S2
    if (currentScenario === 1) {
      if (currentNode !== "END") {
        return NextResponse.json(
          { error: "لا يمكن الانتقال للسيناريو الثاني قبل إتمام السيناريو الأول." },
          { status: 409 }
        );
      }

      await updateSessionState({
        sessionId: session.id,
        currentScenario: 2,
        currentNode: SCENARIO_2_START_NODE_ID,
      });

      return NextResponse.json({
        currentScenario: 2,
        currentNode: SCENARIO_2_START_NODE_ID,
        state: "advanced",
      });
    }

    // S2 END -> S3
    if (currentScenario === 2) {
      if (currentNode !== "END") {
        return NextResponse.json(
          { error: "لا يمكن الانتقال للسيناريو الثالث قبل إتمام السيناريو الثاني." },
          { status: 409 }
        );
      }

      await updateSessionState({
        sessionId: session.id,
        currentScenario: 3,
        currentNode: SCENARIO_3_START_NODE_ID,
      });

      return NextResponse.json({
        currentScenario: 3,
        currentNode: SCENARIO_3_START_NODE_ID,
        state: "advanced",
      });
    }

    // S3 END -> S4
    if (currentScenario === 3) {
      if (currentNode !== "END") {
        return NextResponse.json(
          { error: "لا يمكن الانتقال للسيناريو الرابع قبل إتمام السيناريو الثالث." },
          { status: 409 }
        );
      }

      await updateSessionState({
        sessionId: session.id,
        currentScenario: 4,
        currentNode: SCENARIO_4_START_NODE_ID,
      });

      return NextResponse.json({
        currentScenario: 4,
        currentNode: SCENARIO_4_START_NODE_ID,
        state: "advanced",
      });
    }

    // S4 END -> S5
    if (currentScenario === 4) {
      if (currentNode !== "END") {
        return NextResponse.json(
          { error: "لا يمكن الانتقال للسيناريو الخامس قبل إتمام السيناريو الرابع." },
          { status: 409 }
        );
      }

      await updateSessionState({
        sessionId: session.id,
        currentScenario: 5,
        currentNode: SCENARIO_5_START_NODE_ID,
      });

      return NextResponse.json({
        currentScenario: 5,
        currentNode: SCENARIO_5_START_NODE_ID,
        state: "advanced",
      });
    }

    // S5 END: Terminal scenario, reached experiment completion boundary
    if (currentScenario === 5) {
      if (currentNode === "END") {
        return NextResponse.json({
          currentScenario: 5,
          currentNode: "END",
          state: "reached_s5_end",
        });
      }
      return NextResponse.json(
        { error: "السيناريو الخامس لا يزال قيد التقدم." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "حالة السيناريو الحالية غير مدعومة للانتقال." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "تعذر معالجة الانتقال للسيناريو التالي." },
      { status: 500 }
    );
  }
}