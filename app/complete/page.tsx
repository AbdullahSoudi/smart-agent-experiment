import type { Metadata } from "next";
import { SCENARIOS_JOURNEY } from "@/lib/journey";

export const metadata: Metadata = {
  title: "أتممت الرحلة كاملة · تجربة الوكيل الذكي",
  description: "اكتمال المسار التعليمي لجميع المهارات الريادية الخمس",
};

export default function CompletePage() {
  return (
    <main className="viewport-canvas">
      <div className="workspace-frame">
        {/* Workspace Masthead */}
        <header className="workspace-masthead">
          <div className="masthead-meta">
            <span className="masthead-badge">دراسة بحثية تجريبية</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">اكتمال المسار التجريبي</span>
          </div>
          <h1 className="workspace-title">أتممت الرحلة كاملة</h1>
        </header>

        {/* Completion Content Layout */}
        <div className="completion-content">
          <section className="completion-panel" aria-label="رسالة إتمام الرحلة">
            <span className="completion-tag">الرحلة التعليمية المتكاملة</span>
            <p className="completion-message">
              شكرًا لمشاركتك في التجربة.
            </p>

            {/* Five Completed Skills List */}
            <div className="completion-skills-list" role="list" aria-label="المهارات المكتملة">
              {SCENARIOS_JOURNEY.map((scenario) => (
                <div key={scenario.id} className="completion-skill-row" role="listitem">
                  <span className="completion-check-badge" aria-hidden="true">✓</span>
                  <span className="completion-skill-title">{scenario.skillTitle}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Calm Closing Status */}
          <footer className="completion-footer">
            <div className="completion-status-indicator">
              <span className="completion-status-dot" aria-hidden="true" />
              <span>نهاية الجلسة التفاعلية · تم حفظ كافة محطات التجربة</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
