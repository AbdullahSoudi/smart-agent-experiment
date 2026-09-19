import { NextResponse } from "next/server";
import { START_NODE_ID, SCENARIO_VERSION } from "@/lib/scenario";
import { PROMPT_VERSION } from "@/lib/server/evaluator";
import {
  createSession,
  getSessionsByStudentCode,
} from "@/lib/server/persistence";
import { normalizeStudentName, validateStudentName } from "@/lib/validation";

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

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "البيانات المطلوبة غير مكتملة." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    // Accept studentName or student_name
    const rawName =
      typeof payload.studentName === "string"
        ? payload.studentName
        : typeof payload.student_name === "string"
        ? payload.student_name
        : null;

    // Accept studentCode or student_code
    const rawCode =
      typeof payload.studentCode === "string"
        ? payload.studentCode
        : typeof payload.student_code === "string"
        ? payload.student_code
        : null;

    const nameValidation = validateStudentName(rawName);
    if (!nameValidation.valid || !nameValidation.normalized) {
      return NextResponse.json(
        { error: nameValidation.error || "يرجى إدخال اسمك للمتابعة." },
        { status: 400 }
      );
    }
    const normalizedName = nameValidation.normalized;

    if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال كود المشارك للمتابعة." },
        { status: 400 }
      );
    }
    const trimmedCode = rawCode.trim();

    // 1. Participant lookup before creating session
    const existingSessions = await getSessionsByStudentCode(trimmedCode);

    if (existingSessions.length > 0) {
      // Check if any session for this code is already completed
      const completedSession = existingSessions.find(
        (s) => s.status === "completed"
      );

      if (completedSession) {
        // If it has a stored name, verify no conflict
        if (completedSession.student_name !== null) {
          const storedNormalized = normalizeStudentName(completedSession.student_name);
          if (storedNormalized !== normalizedName) {
            return NextResponse.json(
              {
                error: "NAME_CONFLICT",
                message:
                  "الاسم المدخل لا يطابق البيانات المسجلة لهذا الكود. راجع الباحث قبل المتابعة.",
              },
              { status: 409 }
            );
          }
        }
        // Block restart: participant has already completed the experiment
        return NextResponse.json(
          {
            state: "completed",
            message: "لقد أتممت التجربة بالفعل. شكرًا لمشاركتك.",
          },
          { status: 200 }
        );
      }

      // Check active sessions for resume
      const activeSession = existingSessions.find(
        (s) => s.status === "active"
      );

      if (activeSession) {
        // Legacy session safety: if student_name is null, preserve untouched
        if (activeSession.student_name === null) {
          return NextResponse.json(
            {
              error: "LEGACY_CODE",
              message:
                "هذا الكود مرتبط ببيانات سابقة للنظام. يرجى استخدام كود المشارك المخصص لك أو مراجعة الباحث.",
            },
            { status: 409 }
          );
        }

        // Sequential journey session: compare normalized names
        const storedNormalized = normalizeStudentName(activeSession.student_name);
        if (storedNormalized !== normalizedName) {
          return NextResponse.json(
            {
              error: "NAME_CONFLICT",
              message:
                "الاسم المدخل لا يطابق البيانات المسجلة لهذا الكود. راجع الباحث قبل المتابعة.",
            },
            { status: 409 }
          );
        }

        // Names match: resume the SAME session
        return NextResponse.json(
          {
            sessionId: activeSession.id,
            state: "resumed",
            currentScenario: activeSession.current_scenario ?? 1,
            currentNode: activeSession.current_node,
          },
          { status: 200 }
        );
      }
    }

    // 2. New student code: create exactly one session
    const provider = process.env.AI_PROVIDER || "groq";
    const modelId = process.env.AI_MODEL || "openai/gpt-oss-120b";

    const session = await createSession({
      studentName: normalizedName,
      studentCode: trimmedCode,
      status: "active",
      currentScenario: 1,
      currentNode: START_NODE_ID,
      scenarioVersion: SCENARIO_VERSION,
      promptVersion: PROMPT_VERSION,
      provider,
      modelId,
    });

    return NextResponse.json(
      {
        sessionId: session.id,
        state: "new",
        currentScenario: 1,
        currentNode: session.current_node,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "تعذر بدء الجلسة. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}