"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="workspace-frame">
        {/* Workspace Masthead */}
        <header className="workspace-masthead">
          <div className="masthead-meta">
            <span className="masthead-badge">دراسة بحثية تجريبية</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">رحلة ريادة الأعمال والتمكين الاقتصادي</span>
          </div>
        </header>

        {/* Asymmetric Two-Zone Workspace Grid */}
        <div className="start-grid">
          {/* Zone 1: Research Intro & Premise */}
          <section className="start-intro-zone" aria-label="مقدمة التجربة">
            <h1 className="start-main-title">ابدأ التجربة</h1>
            <p className="start-lead">
              أدخل اسمك وكود المشارك المخصص لك للمتابعة عبر سيناريوهات التجربة الخمسة المتتالية لتطوير مهارات ريادة الأعمال الرقمية.
            </p>

            <div className="start-assurance-box">
              <p className="assurance-text">
                تأكد من إدخال نفس الكود المعتمد لك في الدراسة. إذا كنت قد بدأت جلسة سابقة، فسيتم استئناف رحلتك التعليمية تلقائيًا من حيث توقفت.
              </p>
            </div>
          </section>

          {/* Zone 2: Identity Interaction Desk */}
          <section className="start-action-zone" aria-label="بيانات المشارك">
            <div className="desk-panel">
              <h2 className="desk-panel-title">بيانات المشارك</h2>

              {completedNotice && (
                <div className="form-success-alert" role="status" style={{
                  padding: "1rem",
                  marginBottom: "1.25rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10b981",
                  fontSize: "0.95rem",
                  lineHeight: "1.5"
                }}>
                  <p className="success-text" style={{ margin: 0, fontWeight: 500 }}>{completedNotice}</p>
                </div>
              )}

              {errorMessage && (
                <div className="form-error-alert" role="alert">
                  <p className="error-text">{errorMessage}</p>
                </div>
              )}

              <form className="start-form" onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label htmlFor="student_name" className="form-label">
                    الاسم
                  </label>
                  <input
                    id="student_name"
                    name="student_name"
                    type="text"
                    className="form-input"
                    placeholder="أدخل اسمك"
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
                    placeholder="أدخل كود المشارك"
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
                >
                  {isSubmitting ? "جاري البدء..." : "ابدأ التجربة"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}