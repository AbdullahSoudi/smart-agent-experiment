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
    <main className="chat-container">
      <div className="chat-workspace">
        {/* Session Header */}
        <header className="chat-header">
          <div className="chat-header-meta">
            <span className="chat-context-label">جلسة الإرشاد</span>
          </div>
          <h1 className="chat-title">اكتشاف الفرص الرقمية</h1>
        </header>

        {/* Conversational Transcript */}
        <section className="conversation-flow" aria-label="سجل الحوار التعليمي">
          {/* Advisor Question: Largely unboxed with quiet editorial accent */}
          <article className="turn-section turn-advisor">
            <div className="turn-meta">
              <span className="turn-role turn-role-advisor">المرشد</span>
            </div>
            <div className="turn-body">
              <p className="turn-text turn-text-prompt">{advisorPrompt}</p>
            </div>
          </article>

          {/* Student Response: Quiet warm reflective note */}
          <article className="turn-section turn-student">
            <div className="turn-meta">
              <span className="turn-role turn-role-student">إجابتك</span>
            </div>
            <div className="turn-body">
              <p className="turn-text">{MOCK_STUDENT_RESPONSE}</p>
            </div>
          </article>

          {/* Advisor Feedback: Lightweight coaching observation */}
          <article className="turn-section turn-feedback">
            <div className="turn-meta">
              <span className="turn-role turn-role-feedback">ملاحظة المرشد</span>
            </div>
            <div className="turn-body">
              <p className="turn-text turn-text-feedback">{MOCK_ADVISOR_FEEDBACK}</p>
            </div>
          </article>
        </section>

        {/* Current Answer Composer: Integrated into the workspace */}
        <section className="composer-section" aria-label="كتابة الإجابة">
          <form className="composer-form">
            <div className="composer-group">
              <label htmlFor="student-answer" className="composer-label">
                اكتب إجابتك
              </label>
              <textarea
                id="student-answer"
                name="answer"
                rows={5}
                className="composer-textarea"
                placeholder="اكتب إجابتك هنا..."
                dir="rtl"
              />
            </div>

            <div className="composer-actions">
              <button type="button" className="composer-submit-btn">
                إرسال الإجابة
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
