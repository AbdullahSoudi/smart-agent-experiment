import { NextResponse } from "next/server";
import { validateResearcherRequest } from "@/lib/server/research-auth";
import {
  getSequentialSessions,
  getInteractionsForMultipleSessions,
} from "@/lib/server/persistence";
import { deriveFullParticipantReport } from "@/lib/research/report";

export async function GET(request: Request) {
  try {
    const auth = validateResearcherRequest(request);
    if (!auth.authorized) {
      if (auth.status === "not_configured") {
        return NextResponse.json(
          { error: "تقرير الباحث غير مهيأ على الخادم (RESEARCHER_REPORT_PASSWORD)." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "غير مصرح بالوصول." }, { status: 401 });
    }

    const sessions = await getSequentialSessions();
    const sessionIds = sessions.map((s) => s.id);
    const interactions = await getInteractionsForMultipleSessions(sessionIds);

    const participants = sessions.map((s) =>
      deriveFullParticipantReport(s, interactions)
    );

    return NextResponse.json({
      participants,
      totalCount: participants.length,
      completedCount: participants.filter((p) => p.summary.status === "completed").length,
    });
  } catch {
    return NextResponse.json({ error: "تعذر جلب بيانات التقرير." }, { status: 500 });
  }
}
