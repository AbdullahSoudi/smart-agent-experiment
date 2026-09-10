import type { Metadata } from "next";
import { SCENARIO_NODES } from "@/lib/scenario";

export const metadata: Metadata = {
  title: "جلسة الإرشاد · تجربة الوكيل الذكي",
  description: "جلسة حوارية تفاعلية لاستكشاف الفرص الرقمية وتطوير الفكرة الريادية",
};

// T17 Visual Mock Data — static display preview only.
// Not runtime evaluator output or frozen scenario content.
const MOCK_STUDENT_RESPONSE =
  "هبدأ بفهم مشاكل العملاء واحتياجاتهم الأول، وبعدها أحدد فكرة مناسبة تحل مشكلة حقيقية.";

const MOCK_ADVISOR_FEEDBACK =
  "بداية جيدة؛ ربط الفكرة بمشكلة حقيقية عند العميل يساعدك على اكتشاف فرصة أكثر واقعية.";

export default function ChatPage() {
  const n1Node = SCENARIO_NODES.N1;
  const advisorPrompt = "prompt" in n1Node ? n1Node.prompt : "";

  return (
    <main className="viewport-canvas">
      <div className="workspace-frame">
        {/* Session Masthead */}
        <header className="workspace-masthead">
          <div className="masthead-meta">
            <span className="masthead-badge">جلسة الإرشاد</span>
            <span className="masthead-divider" aria-hidden="true">·</span>
            <span className="masthead-context">المحطة 01: نقطة البداية</span>
          </div>
          <h1 className="workspace-title">اكتشاف الفرص الرقمية</h1>
        </header>

        {/* Conversational Transcript Flow */}
        <section className="chat-flow" aria-label="سجل الحوار التعليمي">
          {/* 1. Active Mentor Challenge Anchor (The One Bold Moment) */}
          <article className="turn-block">
            <div className="prompt-anchor-surface">
              <span className="role-tag role-tag-anchor">المرشد · التحدي النشط</span>
              <p className="prompt-text-anchor">{advisorPrompt}</p>
            </div>
          </article>

          {/* 2. Student Reflection Note */}
          <article className="turn-block student-reflection-zone">
            <div className="student-note-surface">
              <span className="role-tag role-tag-student">إجابتك المسجلة</span>
              <p className="student-reflection-text">{MOCK_STUDENT_RESPONSE}</p>
            </div>
          </article>

          {/* 3. Mentor Coaching Marginalia */}
          <article className="turn-block mentor-coaching-zone">
            <div className="coaching-note-surface">
              <span className="role-tag role-tag-coaching">ملاحظة المرشد</span>
              <p className="coaching-text">{MOCK_ADVISOR_FEEDBACK}</p>
            </div>
          </article>
        </section>

        {/* 4. Integrated Response Composer */}
        <section className="composer-desk" aria-label="كتابة الإجابة">
          <form className="composer-form">
            <div className="composer-header">
              <label htmlFor="student-answer" className="composer-label">
                اكتب إجابتك
              </label>
              <span className="composer-sublabel">صياغة تفسيرية وتأملية</span>
            </div>

            <textarea
              id="student-answer"
              name="answer"
              rows={5}
              className="composer-textarea"
              placeholder="اكتب إجابتك هنا..."
              dir="rtl"
            />

            <div className="composer-footer">
              <button type="button" className="btn-primary composer-btn">
                إرسال الإجابة
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
