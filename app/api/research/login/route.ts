import { NextResponse } from "next/server";
import {
  isResearcherAuthConfigured,
  verifyResearcherPassword,
  createResearcherSessionCookieValue,
} from "@/lib/server/research-auth";
import {
  getClientIp,
  hashClientIdentity,
  checkResearcherRateLimit,
  recordResearcherFailedAttempt,
  clearResearcherRateLimit,
  GENERIC_RATE_LIMIT_ERROR,
} from "@/lib/server/research-rate-limit";

export async function POST(request: Request) {
  try {
    if (!isResearcherAuthConfigured()) {
      return NextResponse.json(
        { error: "خدمة تقرير الباحث غير مهيأة على الخادم. يرجى مراجعة متغير البيئة RESEARCHER_REPORT_PASSWORD." },
        { status: 503 }
      );
    }

    const clientIp = getClientIp(request);
    const clientHash = hashClientIdentity(clientIp);

    // 1. Distributed brute-force rate limit check
    const rateLimit = await checkResearcherRateLimit(clientHash);
    if (rateLimit.serviceUnavailable) {
      return NextResponse.json(
        { error: "خدمة تسجيل الدخول غير متاحة مؤقتاً لتعذر التحقق من نظام الأمان. يرجى المحاولة لاحقاً." },
        { status: 503 }
      );
    }
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: GENERIC_RATE_LIMIT_ERROR },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
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

    // 2. Strict timing-safe password verification
    const isValid = verifyResearcherPassword(password);
    if (!isValid) {
      // Record failed attempt in database (fail-closed if DB recording fails)
      const recorded = await recordResearcherFailedAttempt(clientHash);
      if (!recorded) {
        return NextResponse.json(
          { error: "خدمة تسجيل الدخول غير متاحة مؤقتاً لتعذر التحقق من نظام الأمان. يرجى المحاولة لاحقاً." },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
    }

    // 3. Successful login: clear failed attempts and issue secure session cookie
    await clearResearcherRateLimit(clientHash);

    const cookieValue = createResearcherSessionCookieValue();
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", cookieValue);
    return response;
  } catch {
    return NextResponse.json({ error: "تعذر تسجيل الدخول حالياً." }, { status: 500 });
  }
}
