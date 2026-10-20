"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SCENARIO_DISPLAY_NAMES, type ScenarioId } from "@/lib/journey";
import { ResearchCreditsFooter } from "@/components/ResearchCreditsFooter";

const STAGES_PREVIEW = [
  { id: 1 as ScenarioId, title: SCENARIO_DISPLAY_NAMES[1], color: "var(--stage-s1, #0EA5E9)", bg: "var(--stage-s1-light, #F0F9FF)", border: "var(--stage-s1-border, #BAE6FD)", icon: "💡" },
  { id: 2 as ScenarioId, title: SCENARIO_DISPLAY_NAMES[2], color: "var(--stage-s2, #8B5CF6)", bg: "var(--stage-s2-light, #F5F3FF)", border: "var(--stage-s2-border, #DDD6FE)", icon: "🚀" },
  { id: 3 as ScenarioId, title: SCENARIO_DISPLAY_NAMES[3], color: "var(--stage-s3, #F59E0B)", bg: "var(--stage-s3-light, #FFFBEB)", border: "var(--stage-s3-border, #FDE68A)", icon: "📊" },
  { id: 4 as ScenarioId, title: SCENARIO_DISPLAY_NAMES[4], color: "var(--stage-s4, #F97360)", bg: "var(--stage-s4-light, #FFF1F2)", border: "var(--stage-s4-border, #FECDD3)", icon: "⚡" },
  { id: 5 as ScenarioId, title: SCENARIO_DISPLAY_NAMES[5], color: "var(--stage-s5, #14B8A6)", bg: "var(--stage-s5-light, #F0FDFA)", border: "var(--stage-s5-border, #99F6E4)", icon: "📈" },
];

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "intro">("login");
  const [studentName, setStudentName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedNotice, setCompletedNotice] = useState<string | null>(null);

  // Restore client-side draft registration on initial mount (survives refresh on #intro)
  useEffect(() => {
    try {
      const savedName = sessionStorage.getItem("draft_participant_name") || "";
      const savedCode = sessionStorage.getItem("draft_participant_code") || "";

      if (savedName) setStudentName(savedName);
      if (savedCode) setStudentCode(savedCode);

      // Only restore to Screen 2 if URL explicitly has #intro and valid draft exists
      if (
        window.location.hash === "#intro" &&
        savedName.trim().length > 0 &&
        savedCode.trim().length > 0
      ) {
        setStep("intro");
      } else {
        setStep("login");
      }
    } catch {
      // Ignore sessionStorage errors in restricted browser environments
    }
  }, []);

  // Sync browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash === "#intro") {
        if (studentName.trim() && studentCode.trim()) {
          setStep("intro");
        } else {
          setStep("login");
        }
      } else {
        setStep("login");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [studentName, studentCode]);

  // Screen 1: Validate and transition to Screen 2 (No network/DB session created)
  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
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

    setErrorMessage(null);
    setCompletedNotice(null);
    setStep("intro");

    try {
      sessionStorage.setItem("draft_participant_name", trimmedName);
      sessionStorage.setItem("draft_participant_code", trimmedCode);
      sessionStorage.setItem("draft_onboarding_step", "intro");
    } catch {
      // Ignore sessionStorage errors
    }

    if (typeof window !== "undefined" && window.location.hash !== "#intro") {
      window.history.pushState({ step: "intro" }, "", "#intro");
    }
  };

  // Screen 2: Go back to Screen 1 to correct name or code
  const handleBack = useCallback(() => {
    setStep("login");
    setErrorMessage(null);
    setCompletedNotice(null);

    try {
      sessionStorage.setItem("draft_onboarding_step", "login");
    } catch {
      // Ignore sessionStorage errors
    }

    if (typeof window !== "undefined" && window.location.hash === "#intro") {
      window.history.back();
    }
  }, []);

  // Screen 2: Explicit Start CTA (Invokes authoritative session creation/resume)
  const handleStartExperiment = async () => {
    if (isSubmitting) return; // Prevent double submission

    const trimmedName = studentName.trim();
    const trimmedCode = studentCode.trim();

    if (!trimmedName) {
      setErrorMessage("يرجى إدخال اسمك للمتابعة.");
      setStep("login");
      return;
    }
    if (!trimmedCode) {
      setErrorMessage("يرجى إدخال كود المشارك للمتابعة.");
      setStep("login");
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
          data.message || data.error || "تعذر الاتصال بالخدمة مؤقتًا. حاول مرة أخرى."
        );
        setIsSubmitting(false);
        return;
      }

      if (data.sessionId) {
        sessionStorage.removeItem("experiment_session_id");
        sessionStorage.setItem("experiment_session_id", data.sessionId);
        try {
          sessionStorage.removeItem("draft_participant_name");
          sessionStorage.removeItem("draft_participant_code");
          sessionStorage.removeItem("draft_onboarding_step");
        } catch {
          // Ignore sessionStorage errors
        }
        router.push("/chat");
      } else {
        setErrorMessage(
          data.message || data.error || "تعذر بدء الجلسة. حاول مرة أخرى."
        );
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage("تعذر الاتصال بالخدمة مؤقتًا. حاول مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // SCREEN 1: Registration / Login Screen Only
  // =========================================================================
  if (step === "login") {
    return (
      <main className="viewport-canvas login-viewport">
        <div className="login-page-container">
          <div className="login-card" role="region" aria-label="تسجيل الدخول">
            <h1 className="login-card-title">بيانات المشارك</h1>

            {completedNotice && (
              <div className="form-success-alert" role="status">
                <p className="success-text">{completedNotice}</p>
              </div>
            )}

            {errorMessage && (
              <div className="form-error-alert" role="alert">
                <p className="error-text">{errorMessage}</p>
              </div>
            )}

            <form className="start-form" onSubmit={handleNext}>
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
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
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
                  onChange={(e) => {
                    setStudentCode(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <p id="code-hint" className="form-hint">
                  استخدم نفس الكود المعتمد في الاختبار القبلي للدراسة.
                </p>
              </div>

              <button
                type="submit"
                className="btn-primary start-submit-btn login-submit-btn"
                disabled={!studentName.trim() || !studentCode.trim()}
              >
                التالي
              </button>
            </form>
          </div>

          <ResearchCreditsFooter />
        </div>
      </main>
    );
  }

  // =========================================================================
  // SCREEN 2: Introductory Screen & Canonical 5 Scenarios
  // =========================================================================
  return (
    <main className="viewport-canvas">
      <div className="workspace-frame intro-workspace-frame">
        {/* Workspace Masthead */}
        <header className="workspace-masthead" style={{ marginBottom: "1.75rem" }}>
          <div className="masthead-meta">
            <span className="masthead-badge">ريادة الأعمال الرقمية</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">دراسة بحثية تجريبية في ريادة الأعمال الرقمية</span>
          </div>
        </header>

        {/* Intro Content Hero Section */}
        <section className="intro-hero-panel" aria-label="مقدمة التجربة">
          <div className="intro-header-block">
            <div className="intro-badge">
              <span aria-hidden="true">✨</span>
              <span>مختبر ريادة الأعمال الرقمية</span>
            </div>
            <h1 className="start-main-title" style={{ fontSize: "2.15rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.85rem", lineHeight: 1.25 }}>
              ابدأ رحلتك الريادية
            </h1>
            <p className="start-lead" style={{ fontSize: "0.975rem", lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
              أدخل اسمك وكود المشارك المخصص لك للمتابعة عبر سيناريوهات التجربة الخمسة المتتالية لتطوير مهارات ريادة الأعمال الرقمية.
            </p>
          </div>

          {/* Participant Info Banner */}
          <div className="intro-participant-bar">
            <div className="participant-info-summary">
              <span className="participant-label">المشارك:</span>
              <span className="participant-value">{studentName}</span>
              <span className="participant-divider" aria-hidden="true">·</span>
              <span className="participant-label">كود المشارك:</span>
              <span className="participant-code-tag">{studentCode}</span>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="btn-link-edit"
              disabled={isSubmitting}
              aria-label="تعديل بيانات المشارك والعودة لشاشة التسجيل"
            >
              تعديل البيانات
            </button>
          </div>

          {/* Five Sequential Canonical Scenario Cards */}
          <div className="start-stages-grid" role="list" aria-label="المراحل الخمس للتجربة" style={{
            display: "grid",
            gap: "0.75rem",
            margin: "0.25rem 0"
          }}>
            {STAGES_PREVIEW.map((stage) => (
              <div
                key={stage.id}
                role="listitem"
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

          {/* Research Notice */}
          <div className="start-assurance-box" style={{ margin: 0 }}>
            <p className="assurance-text">
              تأكد من إدخال نفس الكود المعتمد لك في الدراسة. إذا كنت قد بدأت جلسة سابقة، فسيتم استئناف رحلتك التعليمية تلقائيًا من حيث توقفت.
            </p>
          </div>

          {completedNotice && (
            <div className="form-success-alert" role="status" style={{
              padding: "1rem 1.15rem",
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

          {/* Navigation Action Buttons */}
          <div className="intro-actions-container">
            <button
              type="button"
              onClick={handleStartExperiment}
              className="start-cta-btn"
              disabled={isSubmitting || !!completedNotice}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "جاري التحقق والبدء..." : "ابدأ التجربة ←"}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="btn-back-action"
              disabled={isSubmitting}
            >
              رجوع
            </button>
          </div>
        </section>

        <ResearchCreditsFooter />
      </div>
    </main>
  );
}
