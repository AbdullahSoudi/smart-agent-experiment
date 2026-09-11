"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SCENARIO_NODES, type NodeId } from "@/lib/scenario";

interface TurnHistory {
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
  const [turnHistory, setTurnHistory] = useState<TurnHistory | null>(null);
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

  const n1Node = SCENARIO_NODES.N1;
  const n1Prompt = "prompt" in n1Node ? n1Node.prompt : "";

  const activeNode = SCENARIO_NODES[currentNodeId];
  const activePrompt =
    "prompt" in activeNode
      ? activeNode.prompt
      : "message" in activeNode
      ? activeNode.message
      : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessionId) {
      router.replace("/");
      return;
    }

    const trimmed = studentAnswer.trim();
    if (!trimmed) {
      setErrorMessage("يرجى كتابة إجابة للمتابعة.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/n1/submit", {
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
      setTurnHistory({
        prompt: n1Prompt,
        studentAnswer: trimmed,
        feedback: data.feedback,
      });
      setCurrentNodeId(data.nextNode);
      setStudentAnswer("");
      setIsSubmitting(false);
    } catch {
      setErrorMessage("تعذر إرسال الإجابة الآن. حاول مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  const isCompletedTurn = turnHistory !== null;

  return (
    <main className="viewport-canvas">
      <div className="workspace-frame">
        {/* Session Masthead */}
        <header className="workspace-masthead">
          <div className="masthead-meta">
            <span className="masthead-badge">جلسة الإرشاد</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">
              {!isCompletedTurn ? "المحطة 01: نقطة البداية" : `المحطة التالية: ${activeNode.title}`}
            </span>
          </div>
          <h1 className="workspace-title">اكتشاف الفرص الرقمية</h1>
        </header>

        {/* Conversational Transcript Flow */}
        <section className="chat-flow" aria-label="سجل الحوار التعليمي">
          {!isCompletedTurn ? (
            /* Initial N1 Prompt (The One Bold Moment) */
            <article className="turn-block">
              <div className="prompt-anchor-surface">
                <span className="role-tag role-tag-anchor">المرشد · التحدي النشط</span>
                <p className="prompt-text-anchor">{n1Prompt}</p>
              </div>
            </article>
          ) : (
            /* Completed N1 Turn + Next Prompt Anchor */
            <>
              {/* Prior N1 Prompt */}
              <article className="turn-block">
                <div className="prompt-anchor-surface">
                  <span className="role-tag role-tag-anchor">المرشد · نقطة البداية (N1)</span>
                  <p className="prompt-text-anchor">{turnHistory.prompt}</p>
                </div>
              </article>

              {/* Student Reflection Note */}
              <article className="turn-block student-reflection-zone">
                <div className="student-note-surface">
                  <span className="role-tag role-tag-student">إجابتك المسجلة</span>
                  <p className="student-reflection-text">{turnHistory.studentAnswer}</p>
                </div>
              </article>

              {/* Mentor Coaching Marginalia */}
              <article className="turn-block mentor-coaching-zone">
                <div className="coaching-note-surface">
                  <span className="role-tag role-tag-coaching">ملاحظة المرشد</span>
                  <p className="coaching-text">{turnHistory.feedback}</p>
                </div>
              </article>

              {/* Active Next Challenge Anchor */}
              <article className="turn-block">
                <div className="prompt-anchor-surface">
                  <span className="role-tag role-tag-anchor">
                    المرشد · التحدي النشط ({currentNodeId})
                  </span>
                  <p className="prompt-text-anchor">{activePrompt}</p>
                </div>
              </article>
            </>
          )}
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
                {!isCompletedTurn ? "صياغة تفسيرية وتأملية" : "تم تسجيل إجابة المحطة الأولى"}
              </span>
            </div>

            <textarea
              id="student-answer"
              name="answer"
              rows={5}
              className="composer-textarea"
              placeholder={
                !isCompletedTurn
                  ? "اكتب إجابتك هنا..."
                  : "تم تسجيل إجابة المحطة الأولى بنجاح للمتابعة في مراحل لاحقة."
              }
              dir="rtl"
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              disabled={isSubmitting || isCompletedTurn}
            />

            <div className="composer-footer">
              <button
                type="submit"
                className="btn-primary composer-btn"
                disabled={isSubmitting || isCompletedTurn || !studentAnswer.trim()}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? "جاري المعالجة..."
                  : isCompletedTurn
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
