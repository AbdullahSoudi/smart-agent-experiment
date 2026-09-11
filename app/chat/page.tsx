"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SCENARIO_NODES, type NodeId } from "@/lib/scenario";

interface TurnHistoryItem {
  nodeId: NodeId;
  prompt: string;
  studentAnswer?: string | null;
  feedback?: string | null;
  isScaffolding?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId>("N1");
  const [completedTurns, setCompletedTurns] = useState<TurnHistoryItem[]>([]);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [selectedRescueChoice, setSelectedRescueChoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const storedSessionId = sessionStorage.getItem("experiment_session_id");
    if (!storedSessionId) {
      router.replace("/");
      return;
    }
    setSessionId(storedSessionId);
  }, [router]);

  const activeNode = SCENARIO_NODES[currentNodeId];
  const activePrompt =
    "prompt" in activeNode
      ? activeNode.prompt
      : "message" in activeNode
      ? activeNode.message
      : "";

  // Auto-continuation for non-interactive scaffolding nodes (such as N2_H)
  useEffect(() => {
    if (currentNodeId === "N2_H" && sessionId) {
      let isMounted = true;
      setIsSubmitting(true);
      setErrorMessage(null);

      const performContinue = async () => {
        try {
          const res = await fetch("/api/n2-h/continue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });

          const data = await res.json();
          if (!isMounted) return;

          if (!res.ok) {
            setErrorMessage(
              data.error || "تعذر المتابعة التلقائية حاليًا. يرجى إعادة المحاولة."
            );
            setIsSubmitting(false);
            return;
          }

          // Success: advance turn and persist scaffolding in visible transcript
          setCompletedTurns((prev) => [
            ...prev,
            {
              nodeId: "N2_H",
              prompt: activePrompt,
              studentAnswer: null,
              feedback: null,
              isScaffolding: true,
            },
          ]);
          setCurrentNodeId(data.nextNode);
          setIsSubmitting(false);
        } catch {
          if (isMounted) {
            setErrorMessage(
              "تعذر الاتصال بالخادم لمتابعة التوجيه. يرجى إعادة المحاولة."
            );
            setIsSubmitting(false);
          }
        }
      };

      performContinue();

      return () => {
        isMounted = false;
      };
    }
  }, [currentNodeId, sessionId, retryTrigger, activePrompt]);

  // Implemented interactive input nodes in current development slice
  const canSubmit =
    currentNodeId === "N1" ||
    currentNodeId === "N2" ||
    currentNodeId === "N3" ||
    currentNodeId === "N4" ||
    currentNodeId === "N4_REV" ||
    currentNodeId === "N5" ||
    currentNodeId === "N1_H" ||
    currentNodeId === "N3_H" ||
    currentNodeId === "N4_H" ||
    currentNodeId === "N5_H";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) {
      router.replace("/");
      return;
    }

    if (!canSubmit) {
      return;
    }

    const trimmed = studentAnswer.trim();
    if (!trimmed) {
      setErrorMessage("يرجى كتابة إجابة للمتابعة.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const endpoint =
      currentNodeId === "N1"
        ? "/api/n1/submit"
        : currentNodeId === "N2"
        ? "/api/n2/submit"
        : currentNodeId === "N3"
        ? "/api/n3/submit"
        : currentNodeId === "N3_H"
        ? "/api/n3-h/submit"
        : currentNodeId === "N4"
        ? "/api/n4/submit"
        : currentNodeId === "N4_REV"
        ? "/api/n4-rev/submit"
        : currentNodeId === "N4_H"
        ? "/api/n4-h/submit"
        : currentNodeId === "N5"
        ? "/api/n5/submit"
        : currentNodeId === "N5_H"
        ? "/api/n5-h/submit"
        : "/api/n1-h/submit";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          answer: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "تعذر إرسال الإجابة الآن. حاول مرة أخرى.");
        setIsSubmitting(false);
        return;
      }

      // Success: advance turn
      setCompletedTurns((prev) => [
        ...prev,
        {
          nodeId: currentNodeId,
          prompt: activePrompt,
          studentAnswer: trimmed,
          feedback: data.feedback ?? null,
        },
      ]);
      setCurrentNodeId(data.nextNode);
      setStudentAnswer("");

      // When reaching END, finalize session server-side before navigating to /complete
      if (data.nextNode === "END") {
        try {
          const compRes = await fetch("/api/session/complete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId }),
          });

          if (compRes.ok) {
            sessionStorage.removeItem("experiment_session_id");
            router.replace("/complete");
            return;
          } else {
            setErrorMessage("تعذر إنهاء الجلسة حاليًا. حاول مرة أخرى.");
          }
        } catch {
          setErrorMessage("تعذر إنهاء الجلسة حاليًا. حاول مرة أخرى.");
        }
      }

      setIsSubmitting(false);
    } catch {
      setErrorMessage("تعذر إرسال الإجابة الآن. حاول مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  const handleRescueSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) {
      router.replace("/");
      return;
    }

    if (!selectedRescueChoice) {
      setErrorMessage("يرجى تحديد خيار للمتابعة.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/n1-f/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          choice: selectedRescueChoice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "تعذر إرسال الإجابة الآن. حاول مرة أخرى.");
        setIsSubmitting(false);
        return;
      }

      // Success: advance turn
      setCompletedTurns((prev) => [
        ...prev,
        {
          nodeId: currentNodeId,
          prompt: activePrompt,
          studentAnswer: selectedRescueChoice,
          feedback: data.feedback ?? null,
        },
      ]);
      setCurrentNodeId(data.nextNode);
      setSelectedRescueChoice(null);
      setStudentAnswer("");
      setIsSubmitting(false);
    } catch {
      setErrorMessage("تعذر إرسال الإجابة الآن. حاول مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  const isCompletedAnyTurn = completedTurns.length > 0;

  return (
    <main className="viewport-canvas">
      <div className="workspace-frame">
        {/* Session Masthead */}
        <header className="workspace-masthead">
          <div className="masthead-meta">
            <span className="masthead-badge">جلسة الإرشاد</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">
              {!isCompletedAnyTurn ? "المحطة 01: نقطة البداية" : `المحطة التالية: ${activeNode.title}`}
            </span>
          </div>
          <h1 className="workspace-title">اكتشاف الفرص الرقمية</h1>
        </header>

        {/* Conversational Transcript Flow */}
        <section className="chat-flow" aria-label="سجل الحوار التعليمي">
          {/* Prior Completed Turns */}
          {completedTurns.map((turn, index) => {
            if (turn.isScaffolding || turn.nodeId === "N2_H") {
              return (
                <article key={`${turn.nodeId}-${index}`} className="turn-block">
                  <div
                    className="prompt-anchor-surface"
                    style={{
                      borderRight: "3px solid var(--accent-primary, #0f766e)",
                    }}
                  >
                    <span className="role-tag role-tag-anchor">
                      المرشد · توجيه داعم ({SCENARIO_NODES[turn.nodeId].title || turn.nodeId})
                    </span>
                    <p className="prompt-text-anchor">{turn.prompt}</p>
                  </div>
                </article>
              );
            }

            return (
              <div key={`${turn.nodeId}-${index}`}>
                {/* Prior Prompt Anchor */}
                <article className="turn-block">
                  <div className="prompt-anchor-surface">
                    <span className="role-tag role-tag-anchor">
                      {turn.nodeId === "N1"
                        ? "المرشد · نقطة البداية (N1)"
                        : `المرشد · محطة ${turn.nodeId}`}
                    </span>
                    <p className="prompt-text-anchor">{turn.prompt}</p>
                  </div>
                </article>

                {/* Student Reflection Note */}
                {turn.studentAnswer && (
                  <article className="turn-block student-reflection-zone">
                    <div className="student-note-surface">
                      <span className="role-tag role-tag-student">إجابتك المسجلة</span>
                      <p className="student-reflection-text">{turn.studentAnswer}</p>
                    </div>
                  </article>
                )}

                {/* Mentor Coaching Marginalia (rendered only if feedback exists) */}
                {turn.feedback && (
                  <article className="turn-block mentor-coaching-zone">
                    <div className="coaching-note-surface">
                      <span className="role-tag role-tag-coaching">ملاحظة المرشد</span>
                      <p className="coaching-text">{turn.feedback}</p>
                    </div>
                  </article>
                )}
              </div>
            );
          })}

          {/* Active Challenge Anchor */}
          <article className="turn-block">
            <div className="prompt-anchor-surface">
              <span className="role-tag role-tag-anchor">
                {!isCompletedAnyTurn
                  ? "المرشد · التحدي النشط"
                  : `المرشد · التحدي النشط (${currentNodeId})`}
              </span>
              <p className="prompt-text-anchor">{activePrompt}</p>
            </div>
          </article>
        </section>

        {/* Integrated Response Composer */}
        <section className="composer-desk" aria-label="كتابة الإجابة">
          {errorMessage && (
            <div className="form-error-alert" role="alert">
              <p className="error-text">{errorMessage}</p>
            </div>
          )}

          {currentNodeId === "N2_H" ? (
            <div
              className="scaffolding-status"
              style={{ textAlign: "center", padding: "1.5rem 0" }}
            >
              {errorMessage ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <button
                    type="button"
                    className="btn-primary composer-btn"
                    onClick={() => setRetryTrigger((c) => c + 1)}
                  >
                    إعادة المحاولة للمتابعة
                  </button>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                  جاري المتابعة تلقائيًا إلى المحطة التالية...
                </p>
              )}
            </div>
          ) : currentNodeId === "N1_F" ? (
            <form className="composer-form" onSubmit={handleRescueSubmit}>
              <div className="composer-header">
                <span className="composer-label">اختر الإجابة المناسبة</span>
                <span className="composer-sublabel">اختيار توجيهي من متعدد</span>
              </div>

              <div
                className="choice-group"
                role="radiogroup"
                aria-label="خيارات مسار الإنقاذ"
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
              >
                {"choices" in activeNode && Array.isArray(activeNode.choices)
                  ? activeNode.choices.map((choiceText: string, idx: number) => {
                      const isSelected = selectedRescueChoice === choiceText;
                      return (
                        <label
                          key={idx}
                          className={`choice-option-card ${isSelected ? "choice-option-selected" : ""}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.875rem",
                            padding: "1rem 1.25rem",
                            borderRadius: "var(--radius-md, 8px)",
                            border: isSelected
                              ? "2px solid var(--accent-primary, #0f766e)"
                              : "1px solid var(--border-strong, #cbd5e1)",
                            backgroundColor: isSelected
                              ? "var(--surface-subtle, #f0fdfa)"
                              : "#ffffff",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <input
                            type="radio"
                            name="rescue-choice"
                            value={choiceText}
                            checked={isSelected}
                            onChange={() => {
                              if (!isSubmitting) setSelectedRescueChoice(choiceText);
                            }}
                            disabled={isSubmitting}
                            style={{
                              width: "1.125rem",
                              height: "1.125rem",
                              accentColor: "var(--accent-primary, #0f766e)",
                              cursor: isSubmitting ? "not-allowed" : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "1rem",
                              lineHeight: "1.6",
                              color: "var(--text-primary, #1e293b)",
                            }}
                          >
                            {choiceText}
                          </span>
                        </label>
                      );
                    })
                  : null}
              </div>

              <div className="composer-footer">
                <button
                  type="submit"
                  className="btn-primary composer-btn"
                  disabled={isSubmitting || !selectedRescueChoice}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? "جاري المعالجة..." : "تأكيد الاختيار ومتابعة"}
                </button>
              </div>
            </form>
          ) : (
            <form className="composer-form" onSubmit={handleSubmit}>
              <div className="composer-header">
                <label htmlFor="student-answer" className="composer-label">
                  اكتب إجابتك
                </label>
                <span className="composer-sublabel">
                  {canSubmit ? "صياغة تفسيرية وتأملية" : "تم تسجيل إجابة المحطة"}
                </span>
              </div>

              <textarea
                id="student-answer"
                name="answer"
                rows={5}
                className="composer-textarea"
                placeholder={
                  canSubmit
                    ? "اكتب إجابتك هنا..."
                    : "تم تسجيل إجابة المحطة بنجاح للمتابعة في مراحل لاحقة."
                }
                dir="rtl"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                disabled={isSubmitting || !canSubmit}
              />

              <div className="composer-footer">
                <button
                  type="submit"
                  className="btn-primary composer-btn"
                  disabled={isSubmitting || !canSubmit || !studentAnswer.trim()}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting
                    ? "جاري المعالجة..."
                    : !canSubmit
                    ? "تم تسجيل الإجابة"
                    : "إرسال الإجابة"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
