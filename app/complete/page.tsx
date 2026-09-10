import type { Metadata } from "next";
import { SCENARIO_NODES } from "@/lib/scenario";

export const metadata: Metadata = {
  title: "اكتملت التجربة · تجربة الوكيل الذكي",
  description: "اكتمال سيناريو استكشاف الفرص الرقمية وتطوير الفكرة الريادية",
};

export default function CompletePage() {
  const endNode = SCENARIO_NODES.END;
  const completionMessage = "message" in endNode ? endNode.message : "";

  return (
    <main className="viewport-canvas">
      <div className="workspace-frame">
        {/* Workspace Masthead */}
        <header className="workspace-masthead">
          <div className="masthead-meta">
            <span className="masthead-badge">دراسة بحثية تجريبية</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">نهاية السيناريو</span>
          </div>
          <h1 className="workspace-title">اكتملت التجربة</h1>
        </header>

        {/* Completion Content Layout */}
        <div className="completion-content">
          <section className="completion-panel" aria-label="رسالة إتمام السيناريو">
            <span className="completion-tag">خاتمة السيناريو</span>
            <p className="completion-message">{completionMessage}</p>
          </section>

          {/* Minimal Closing Visual Structure */}
          <footer className="completion-footer">
            <div className="completion-status-indicator">
              <span className="completion-status-dot" aria-hidden="true" />
              <span>نهاية الجلسة التفاعلية</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
