import { NextResponse } from "next/server";
import {
  isResearcherAuthConfigured,
  verifyResearcherPassword,
  createResearcherSessionCookieValue,
} from "@/lib/server/research-auth";

export async function POST(request: Request) {
  try {
    if (!isResearcherAuthConfigured()) {
      return NextResponse.json(
        { error: "خدمة تقرير الباحث غير مهيأة على الخادم. يرجى مراجعة متغير البيئة RESEARCHER_REPORT_PASSWORD." },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
    }

    const { password } = (body || {}) as { password?: unknown };
    if (typeof password !== "string" || !password.trim()) {
      return NextResponse.json({ error: "يرجى إدخال كلمة المرور." }, { status: 400 });
    }

    const isValid = verifyResearcherPassword(password);
    if (!isValid) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
    }

    const cookieValue = createResearcherSessionCookieValue();
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", cookieValue);
    return response;
  } catch {
    return NextResponse.json({ error: "تعذر تسجيل الدخول حالياً." }, { status: 500 });
  }
}
