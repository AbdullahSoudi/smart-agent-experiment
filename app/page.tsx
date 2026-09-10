export default function HomePage() {
  return (
    <main className="start-container">
      <article className="start-card">
        <header className="start-header">
          <div className="context-meta">
            <span className="context-label">دراسة بحثية تجريبية</span>
          </div>
          <h1 className="start-title">ابدأ التجربة</h1>
          <p className="start-description">
            أدخل كود المشارك المخصص لك للمتابعة إلى سيناريو استكشاف الفرص الرقمية وتطوير الفكرة الريادية.
          </p>
        </header>

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

          <button type="button" className="submit-btn">
            متابعة
          </button>
        </form>

        <footer className="start-footer">
          <p className="privacy-note">
            لا يُطلب منك إدخال اسمك أو بريدك الإلكتروني. استخدم فقط كود الطالب المخصص للدراسة.
          </p>
        </footer>
      </article>
    </main>
  );
}
