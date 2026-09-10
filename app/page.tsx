export default function HomePage() {
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

              <form className="start-form">
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
                  />
                  <p id="code-hint" className="form-hint">
                    استخدم نفس الكود المعتمد في الاختبار القبلي للدراسة.
                  </p>
                </div>

                <button type="button" className="btn-primary start-submit-btn">
                  متابعة
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
