import type { Metadata } from "next";
import { SCENARIOS_JOURNEY } from "@/lib/journey";

export const metadata: Metadata = {
  title: "أتممت الرحلة كاملة · تجربة الوكيل الذكي",
  description: "اكتمال المسار التعليمي لجميع المهارات الريادية الخمس",
};

const STAGE_THEMES: Record<number, { color: string; bg: string; border: string; icon: string }> = {
  1: { color: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD", icon: "💡" },
  2: { color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE", icon: "🚀" },
  3: { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: "📊" },
  4: { color: "#F97360", bg: "#FFF1F2", border: "#FECDD3", icon: "⚡" },
  5: { color: "#14B8A6", bg: "#F0FDFA", border: "#99F6E4", icon: "📈" },
};

export default function CompletePage() {
  return (
    <main className="viewport-canvas">
      <div className="workspace-frame" style={{ maxWidth: "880px", padding: "3rem 1.5rem 5rem" }}>
        {/* Workspace Masthead */}
        <header className="workspace-masthead" style={{ marginBottom: "2rem" }}>
          <div className="masthead-meta">
            <span className="masthead-badge">المرشد الريادي الذكي</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">اكتمال المسار التجريبي</span>
          </div>
          <h1 className="workspace-title" style={{ fontSize: "2.4rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "1rem" }}>
            أتممت الرحلة كاملة
          </h1>
        </header>

        {/* Completion Content Layout */}
        <div className="completion-content">
          <section className="completion-panel" aria-label="رسالة إتمام الرحلة" style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-subtle)",
            borderRadius: "18px", padding: "2rem 2rem", boxShadow: "0 4px 20px -2px rgba(24, 32, 51, 0.05)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span className="completion-tag" style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "var(--color-primary, #5B5FEF)",
                backgroundColor: "rgba(91, 95, 239, 0.08)",
                padding: "0.3rem 0.85rem",
                borderRadius: "9999px"
              }}>
                🎉 إنجاز التجربة المتكاملة
              </span>
            </div>

            <p className="completion-message" style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.75rem", lineHeight: 1.4 }}>
              شكرًا لمشاركتك في التجربة.
            </p>

            <p style={{ fontSize: "1rem", lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: "2rem" }}>
              لقد خضت التحديات التفاعلية الخمسة في مختبر ريادة الأعمال الرقمية، وطبّقت مهارات التفكير الريادي من استكشاف الفرص إلى اتخاذ القرارات القائمة على البيانات.
            </p>

            {/* Five Completed Skills List with Stage Colors */}
            <div className="completion-skills-list" role="list" aria-label="المهارات المكتملة" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {SCENARIOS_JOURNEY.map((scenario) => {
                const theme = STAGE_THEMES[scenario.id] || { color: "#5B5FEF", bg: "#EEF0FD", border: "#CBD5E1", icon: "✓" };
                return (
                  <div
                    key={scenario.id}
                    className="completion-skill-row"
                    role="listitem"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1.1rem 1.35rem",
                      backgroundColor: "#FFFFFF",
                      border: `1.5px solid ${theme.border}`,
                      borderRadius: "12px", boxShadow: "none",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span
                        className="completion-check-badge"
                        aria-hidden="true"
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: theme.bg,
                          color: theme.color,
                          border: `1.5px solid ${theme.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.95rem"
                        }}
                      >
                        ✓
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.color, letterSpacing: "0.02em" }}>
                          المرحلة {scenario.id}
                        </span>
                        <span className="completion-skill-title" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {scenario.skillTitle}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: "1.35rem" }} aria-hidden="true">{theme.icon}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Calm Closing Status */}
          <footer className="completion-footer" style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <div className="completion-status-indicator" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.6rem 1.35rem",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-sm)",
              fontSize: "0.875rem",
              color: "var(--text-muted)"
            }}>
              <span className="completion-status-dot" aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} />
              <span style={{ fontWeight: 600 }}>نهاية الجلسة التفاعلية · تم حفظ كافة محطات التجربة</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
