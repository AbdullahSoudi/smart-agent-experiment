import { NextResponse } from "next/server";
import { validateResearcherRequest } from "@/lib/server/research-auth";
import {
  getSequentialSessions,
  getInteractionsForMultipleSessions,
} from "@/lib/server/persistence";
import { generateParticipantInteractionsCsv } from "@/lib/research/report";

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

    const csvContent = generateParticipantInteractionsCsv(sessions, interactions);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `smart_agent_research_data_${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "تعذر تصدير ملف البيانات." }, { status: 500 });
  }
}
