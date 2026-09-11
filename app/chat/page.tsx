"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SCENARIO_NODES, type NodeId } from "@/lib/scenario";

interface CompletedTurn {
  nodeId: NodeId;
  prompt: string;
  studentAnswer: string;
  feedback: string;
}

export default function ChatPage() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Turn state
  const [completedTurns, setCompletedTurns] = useState<CompletedTurn[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId>("N1");

  useEffect(() => {
    // Check client session
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

  // Implemented interactive input nodes in current development slice
  const canSubmit = currentNodeId === "N1" || currentNodeId === "N2";

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

    const endpoint = currentNodeId === "N1" ? "/api/n1/submit" : "/api/n2/submit";

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
          feedback: data.feedback,
        },
      ]);
      setCurrentNodeId(data.nextNode);
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
          {completedTurns.map((turn, index) => (
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
              <article className="turn-block student-reflection-zone">
                <div className="student-note-surface">
                  <span className="role-tag role-tag-student">إجابتك المسجلة</span>
                  <p className="student-reflection-text">{turn.studentAnswer}</p>
                </div>
              </article>

              {/* Mentor Coaching Marginalia */}
              <article className="turn-block mentor-coaching-zone">
                <div className="coaching-note-surface">
                  <span className="role-tag role-tag-coaching">ملاحظة المرشد</span>
                  <p className="coaching-text">{turn.feedback}</p>
                </div>
              </article>
            </div>
          ))}

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
        </section>
      </div>
    </main>
  );
}
