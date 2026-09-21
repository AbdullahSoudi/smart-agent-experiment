"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES_PREVIEW = [
  { id: 1, title: "اكتشاف الفرص", color: "var(--stage-s1, #1AA7EC)", bg: "var(--stage-s1-light, #EBF7FE)", border: "var(--stage-s1-border, #BAE6FD)", icon: "💡" },
  { id: 2, title: "توليد الأفكار", color: "var(--stage-s2, #7C4DFF)", bg: "var(--stage-s2-light, #F5F1FE)", border: "var(--stage-s2-border, #DDD6FE)", icon: "🚀" },
  { id: 3, title: "نموذج العمل", color: "var(--stage-s3, #F4B942)", bg: "var(--stage-s3-light, #FEF9EB)", border: "var(--stage-s3-border, #FDE68A)", icon: "📊" },
  { id: 4, title: "القرار والمخاطر", color: "var(--stage-s4, #FF6B6B)", bg: "var(--stage-s4-light, #FFF0F0)", border: "var(--stage-s4-border, #FECDD3)", icon: "⚡" },
  { id: 5, title: "التسويق والبيانات", color: "var(--stage-s5, #00A99D)", bg: "var(--stage-s5-light, #EBF9F8)", border: "var(--stage-s5-border, #99F6E4)", icon: "📈" },
];

export default function HomePage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedNotice, setCompletedNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedCode = studentCode.trim();

    if (!trimmedName) {
      setErrorMessage("يرجى إدخال اسمك للمتابعة.");
      return;
    }
    if (!trimmedCode) {
      setErrorMessage("يرجى إدخال كود المشارك للمتابعة.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setCompletedNotice(null);

    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: trimmedName,
          studentCode: trimmedCode,
        }),
      });

      const data = await res.json();

      if (data.state === "completed") {
        setCompletedNotice(
          data.message || "لقد أتممت التجربة بالفعل. شكرًا لمشاركتك."
        );
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setErrorMessage(
          data.message || data.error || "تعذر بدء الجلسة. حاول مرة أخرى."
        );
        setIsSubmitting(false);
        return;
      }

      if (data.sessionId) {
        sessionStorage.removeItem("experiment_session_id");
        sessionStorage.setItem("experiment_session_id", data.sessionId);
        router.push("/chat");
      } else {
        setErrorMessage("تعذر بدء الجلسة. حاول مرة أخرى.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage("تعذر بدء الجلسة. حاول مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="viewport-canvas">
      <div className="workspace-frame" style={{ maxWidth: "1160px", padding: "2.5rem 1.5rem 4rem" }}>
        {/* Workspace Masthead */}
        <header className="workspace-masthead" style={{ marginBottom: "2.5rem" }}>
          <div className="masthead-meta">
            <span className="masthead-badge">المرشد الريادي الذكي</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">دراسة بحثية تجريبية في ريادة الأعمال الرقمية</span>
          </div>
        </header>

        {/* Asymmetric Two-Zone Workspace Grid */}
        <div className="start-grid" style={{ alignItems: "stretch" }}>
          {/* Zone 1: Research Intro & 5-Stage Preview */}
          <section className="start-intro-zone" aria-label="مقدمة التجربة" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1.75rem" }}>
            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.3rem 0.85rem",
                borderRadius: "9999px",
                backgroundColor: "rgba(91, 95, 239, 0.08)",
                color: "var(--color-primary, #5B5FEF)",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1rem"
              }}>
                <span>✨</span>
                <span>مختبر ريادة الأعمال الرقمية</span>
              </div>
              <h1 className="start-main-title" style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1rem", lineHeight: 1.25 }}>
                ابدأ رحلتك الريادية
              </h1>
              <p className="start-lead" style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "var(--text-secondary)", margin: 0 }}>
                أدخل اسمك وكود المشارك المخصص لك للمتابعة عبر سيناريوهات التجربة الخمسة المتتالية لتطوير مهارات ريادة الأعمال الرقمية.
              </p>
            </div>

            {/* 5-Stage Visual Preview */}
            <div className="start-stages-grid" style={{
              display: "grid",
              gap: "0.75rem",
              margin: "0.5rem 0"
            }}>
              {STAGES_PREVIEW.map((stage) => (
                <div
                  key={stage.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: `1.5px solid ${stage.border}`,
                    borderRadius: "14px",
                    padding: "0.85rem 0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "0.35rem",
                    boxShadow: "var(--shadow-sm)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "1.35rem" }} aria-hidden="true">{stage.icon}</span>
                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: stage.color,
                    letterSpacing: "0.02em"
                  }}>
                    المرحلة {stage.id}
                  </span>
                  <span style={{
                    fontSize: "0.825rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.3
                  }}>
                    {stage.title}
                  </span>
                </div>
              ))}
            </div>

            <div className="start-assurance-box" style={{ margin: 0 }}>
              <p className="assurance-text">
                تأكد من إدخال نفس الكود المعتمد لك في الدراسة. إذا كنت قد بدأت جلسة سابقة، فسيتم استئناف رحلتك التعليمية تلقائيًا من حيث توقفت.
              </p>
            </div>
          </section>

          {/* Zone 2: Identity Interaction Desk */}
          <section className="start-action-zone" aria-label="بيانات المشارك">
            <div className="desk-panel" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 className="desk-panel-title" style={{ margin: "0 0 0.4rem 0" }}>
                  بيانات المشارك
                </h2>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  سجل بياناتك للانضمام إلى جلسة المختبر التفاعلية
                </p>
              </div>

              {completedNotice && (
                <div className="form-success-alert" role="status" style={{
                  padding: "1rem 1.15rem",
                  marginBottom: "1.25rem",
                  borderRadius: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#059669",
                  fontSize: "0.95rem",
                  lineHeight: "1.6"
                }}>
                  <p className="success-text" style={{ margin: 0, fontWeight: 600 }}>{completedNotice}</p>
                </div>
              )}

              {errorMessage && (
                <div className="form-error-alert" role="alert" style={{ borderRadius: "12px" }}>
                  <p className="error-text">{errorMessage}</p>
                </div>
              )}

              <form className="start-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="student_name" className="form-label">
                    الاسم
                  </label>
                  <input
                    id="student_name"
                    name="student_name"
                    type="text"
                    className="form-input"
                    placeholder="أدخل اسمك الثلاثي"
                    autoComplete="name"
                    spellCheck="false"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="student_code" className="form-label">
                    كود المشارك
                  </label>
                  <input
                    id="student_code"
                    name="student_code"
                    type="text"
                    className="form-input"
                    placeholder="أدخل كود المشارك المعتمد"
                    autoComplete="off"
                    spellCheck="false"
                    aria-describedby="code-hint"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p id="code-hint" className="form-hint">
                    استخدم نفس الكود المعتمد في الاختبار القبلي للدراسة.
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn-primary start-submit-btn"
                  disabled={isSubmitting || !studentCode.trim() || !studentName.trim()}
                  aria-busy={isSubmitting}
                  style={{ marginTop: "0.75rem" }}
                >
                  {isSubmitting ? "جاري التحقق والبدء..." : "ابدأ التجربة ←"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
