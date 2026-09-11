"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = studentCode.trim();
    if (!trimmed) {
      setErrorMessage("يرجى إدخال كود الطالب للمتابعة.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentCode: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "تعذر بدء الجلسة. حاول مرة أخرى.");
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
            <span className="masthead-context">بيئة استكشاف الفرص الرقمية</span>
          </div>
        </header>

        {/* Asymmetric Two-Zone Workspace Grid */}
        <div className="start-grid">
          {/* Zone 1: Research Intro & Premise */}
          <section className="start-intro-zone" aria-label="مقدمة التجربة">
            <h1 className="start-main-title">ابدأ التجربة</h1>
            <p className="start-lead">
              أدخل كود المشارك المخصص لك للمتابعة إلى سيناريو استكشاف الفرص الرقمية وتطوير الفكرة الريادية.
            </p>

            <div className="start-assurance-box">
              <p className="assurance-text">
                لا يُطلب منك إدخال اسمك أو بريدك الإلكتروني. استخدم فقط كود الطالب المخصص للدراسة.
              </p>
            </div>
          </section>

          {/* Zone 2: Code Interaction Desk */}
          <section className="start-action-zone" aria-label="إدخال كود الطالب">
            <div className="desk-panel">
              <h2 className="desk-panel-title">كود المشارك</h2>

              {errorMessage && (
                <div className="form-error-alert" role="alert">
                  <p className="error-text">{errorMessage}</p>
                </div>
              )}

              <form className="start-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="student_code" className="form-label">
                    كود الطالب
                  </label>
                  <input
                    id="student_code"
                    name="student_code"
                    type="text"
                    className="form-input"
                    placeholder="أدخل كود الطالب"
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
                  disabled={isSubmitting || !studentCode.trim()}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? "جاري البدء..." : "متابعة"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
