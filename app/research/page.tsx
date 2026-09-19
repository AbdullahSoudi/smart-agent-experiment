"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { FullParticipantReport } from "@/lib/research/report";

export default function ResearcherReportPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<FullParticipantReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "s1" | "s2" | "s3" | "s4" | "s5" | "log"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/research/data");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.status === 503) {
        setIsAuthenticated(false);
        setIsConfigured(false);
        return;
      }
      if (!res.ok) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setIsAuthenticated(true);
      setParticipants(data.participants || []);
      if (data.participants && data.participants.length > 0 && !selectedId) {
        setSelectedId(data.participants[0].summary.sessionId);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/research/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 503) {
          setIsConfigured(false);
        }
        setLoginError(data.error || "كلمة المرور غير صحيحة.");
        setIsSubmitting(false);
        return;
      }

      setIsAuthenticated(true);
      setPassword("");
      await fetchData();
    } catch {
      setLoginError("تعذر الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/research/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setParticipants([]);
    setSelectedId(null);
  };

  const handleExportCsv = () => {
    window.location.href = "/api/research/export";
  };

  // 1. Loading State
  if (isAuthenticated === null) {
    return (
      <main className="viewport-canvas">
        <div className="workspace-frame" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
            جاري التحقق من صلاحيات الباحث...
          </p>
        </div>
      </main>
    );
  }

  // 2. Unauthenticated: Login Screen
  if (!isAuthenticated) {
    return (
      <main className="viewport-canvas">
        <div className="workspace-frame" style={{ maxWidth: "520px", margin: "4rem auto" }}>
          <header className="workspace-masthead" style={{ marginBottom: "1.5rem" }}>
            <div className="masthead-meta">
              <span className="masthead-badge">دراسة بحثية</span>
              <span className="masthead-divider">·</span>
              <span className="masthead-context">بوابة الباحث العلمي</span>
            </div>
            <h1 className="workspace-title" style={{ fontSize: "1.6rem" }}>
              تسجيل دخول الباحث
            </h1>
          </header>

          {!isConfigured && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1.5rem",
                color: "#f87171",
                fontSize: "0.95rem",
                lineHeight: "1.6",
              }}
            >
              <strong>الخدمة غير مهيأة:</strong> لم يتم ضبط متغير البيئة{" "}
              <code>RESEARCHER_REPORT_PASSWORD</code> على الخادم. يرجى تهيئته أولاً للمتابعة.
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                htmlFor="researcher-password"
                style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}
              >
                كلمة مرور الباحث:
              </label>
              <input
                id="researcher-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                disabled={!isConfigured || isSubmitting}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  outline: "none",
                }}
              />
            </div>

            {loginError && (
              <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: 0 }}>
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={!isConfigured || isSubmitting || !password.trim()}
              style={{
                padding: "0.9rem 1.5rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--accent-gold)",
                color: "#1e1b4b",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: !isConfigured || isSubmitting ? "not-allowed" : "pointer",
                opacity: !isConfigured || isSubmitting ? 0.6 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {isSubmitting ? "جاري التحقق..." : "دخول إلى لوحة البيانات"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Authenticated: Dashboard
  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.summary.studentName.toLowerCase().includes(q) ||
      p.summary.studentCode.toLowerCase().includes(q)
    );
  });

  const selectedParticipant = participants.find(
    (p) => p.summary.sessionId === selectedId
  );

  const totalCount = participants.length;
  const completedCount = participants.filter((p) => p.summary.status === "completed").length;
  const activeCount = totalCount - completedCount;
  const totalInteractionsCount = participants.reduce(
    (acc, p) => acc + p.summary.totalInteractions,
    0
  );

  return (
    <main className="viewport-canvas" style={{ minHeight: "100vh", padding: "1.5rem 1rem" }}>
      <div className="workspace-frame" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Top Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            paddingBottom: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div className="masthead-meta" style={{ marginBottom: "0.25rem" }}>
              <span className="masthead-badge">دراسة بحثية تجريبية</span>
              <span className="masthead-divider">·</span>
              <span className="masthead-context">لوحة المتابعة والتحليل الموضوعي</span>
            </div>
            <h1 className="workspace-title" style={{ fontSize: "1.6rem", margin: 0 }}>
              سجلات التجربة التتابعية للوكيل الذكي
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={fetchData}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              تحديث البيانات ⟳
            </button>
            <button
              onClick={handleExportCsv}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "var(--accent-gold)",
                color: "#1e1b4b",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              تصدير ملف CSV (كامل) ⤓
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "0.55rem 0.9rem",
                borderRadius: "6px",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              خروج
            </button>
          </div>
        </header>

        {/* Aggregate Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
              إجمالي المشاركين
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {totalCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
              مكتملون
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#10b981" }}>
              {completedCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
              قيد التنفيذ
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#38bdf8" }}>
              {activeCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
              إجمالي التفاعلات
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {totalInteractionsCount}
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
          className="research-split-layout"
        >
          {/* Left Panel: Participants List */}
          <section
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "0.85rem", borderBottom: "1px solid var(--border-subtle)" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الكود..."
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredParticipants.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredParticipants.map((p) => {
                  const isSelected = p.summary.sessionId === selectedId;
                  const isDone = p.summary.status === "completed";
                  return (
                    <div
                      key={p.summary.sessionId}
                      onClick={() => setSelectedId(p.summary.sessionId)}
                      style={{
                        padding: "0.9rem 1rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        backgroundColor: isSelected ? "rgba(255, 215, 0, 0.08)" : "transparent",
                        borderRight: isSelected ? "4px solid var(--accent-gold)" : "4px solid transparent",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.3rem",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {p.summary.studentName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: isDone ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)",
                            color: isDone ? "#10b981" : "#38bdf8",
                            fontWeight: 600,
                          }}
                        >
                          {isDone ? "مكتمل" : `السيناريو ${p.summary.currentScenario}`}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        <code>{p.summary.studentCode}</code>
                        <span>{p.summary.totalInteractions} تفاعل · {p.summary.durationFormatted}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Panel: Selected Participant Detail */}
          <section
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "1.25rem",
              minHeight: "80vh",
            }}
          >
            {!selectedParticipant ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
                اختر مشاركاً من القائمة لعرض تحليلاته وسجلاته التفصيلية.
              </div>
            ) : (
              <div>
                {/* Participant Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: "1.4rem", margin: "0 0 0.4rem 0", color: "var(--text-primary)" }}>
                      {selectedParticipant.summary.studentName}
                    </h2>
                    <div style={{ display: "flex", gap: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      <span>كود المشارك: <code>{selectedParticipant.summary.studentCode}</code></span>
                      <span>الحالة: <strong style={{ color: selectedParticipant.summary.status === "completed" ? "#10b981" : "#38bdf8" }}>{selectedParticipant.summary.status === "completed" ? "مكتمل" : "نشط"}</strong></span>
                      <span>المهارات المنجزة: {selectedParticipant.summary.completedSkillsCount} من 5</span>
                      <span>المدة الكلية: {selectedParticipant.summary.durationFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Scenario Navigation Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    borderBottom: "1px solid var(--border-subtle)",
                    paddingBottom: "0.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {[
                    { id: "overview", label: "نظرة عامة" },
                    { id: "s1", label: "س1: الفرص" },
                    { id: "s2", label: "س2: التحديات وإعادة البناء" },
                    { id: "s3", label: "س3: نموذج العمل" },
                    { id: "s4", label: "س4: الأزمة والمخاطر" },
                    { id: "s5", label: "س5: التسويق واختبار A/B" },
                    { id: "log", label: "السجل الزمني الكامل" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: activeTab === tab.id ? "var(--accent-gold)" : "rgba(255, 255, 255, 0.05)",
                        color: activeTab === tab.id ? "#1e1b4b" : "var(--text-primary)",
                        fontWeight: activeTab === tab.id ? 700 : 500,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview */}
                {activeTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "0.85rem", borderRadius: "6px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>إجابات مقيّمة</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{selectedParticipant.summary.evaluatedCount}</div>
                      </div>
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "0.85rem", borderRadius: "6px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>طلبات دعم حواري</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{selectedParticipant.summary.supportCount}</div>
                      </div>
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "0.85rem", borderRadius: "6px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>خارج الموضوع</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{selectedParticipant.summary.offTopicCount}</div>
                      </div>
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "0.85rem", borderRadius: "6px" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>تصنيف متقدم / متوسط / ضعيف</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                          <span style={{ color: "#10b981" }}>{selectedParticipant.summary.advancedCount}</span> /{" "}
                          <span style={{ color: "#f59e0b" }}>{selectedParticipant.summary.mediumCount}</span> /{" "}
                          <span style={{ color: "#ef4444" }}>{selectedParticipant.summary.weakCount}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "1rem", borderRadius: "6px" }}>
                      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>المسار الإجرائي عبر السيناريوهات:</h4>
                      <code style={{ fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
                        {selectedParticipant.summary.scenarioPathSummary}
                      </code>
                    </div>
                  </div>
                )}

                {/* Tab 2: Scenario 1 */}
                {activeTab === "s1" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>السيناريو 1: استكشاف الفرص الرقمية</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      المسار المسلوك: <code>{selectedParticipant.scenario1.path.join(" → ") || "—"}</code>
                    </p>

                    {selectedParticipant.scenario1.finalOpportunity && (
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "1rem", borderRadius: "6px" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--accent-gold)" }}>الفرصة والقيمة الاقتصادية النهائية (N5):</h4>
                        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.6" }}>
                          {selectedParticipant.scenario1.finalOpportunity}
                        </p>
                      </div>
                    )}

                    <h4 style={{ margin: "0.5rem 0 0 0" }}>الإجابات المقيّمة في السيناريو:</h4>
                    {selectedParticipant.scenario1.evaluatedAnswers.map((ev, i) => (
                      <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                          <strong>العقدة: {ev.node}</strong>
                          <span style={{ fontSize: "0.8rem", color: ev.classification === "advanced" ? "#10b981" : ev.classification === "medium" ? "#f59e0b" : "#ef4444" }}>
                            التصنيف: {ev.classification || "غير مقيّم"}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.9rem" }}>{ev.answer}</p>
                        {ev.feedback && <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>التغذية الراجعة: {ev.feedback}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 3: Scenario 2 */}
                {activeTab === "s2" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>السيناريو 2: اختبار الجدوى وإعادة البناء</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      المسار المسلوك: <code>{selectedParticipant.scenario2.path.join(" → ") || "—"}</code>
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "1rem", borderRadius: "6px" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>الفكرة الأولية (N1):</h4>
                        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.6" }}>
                          {selectedParticipant.scenario2.initialIdea || "—"}
                        </p>
                      </div>

                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "1rem", borderRadius: "6px" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0", color: "#10b981" }}>الفكرة المعاد بناؤها (N4):</h4>
                        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.6" }}>
                          {selectedParticipant.scenario2.rebuiltIdea || "—"}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                        <strong>تحدي الميزانية الصفرية (N2):</strong>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario2.marketingResponse || "—"}</p>
                      </div>
                      <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                        <strong>الميزة التنافسية أمام الكبار (N3):</strong>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario2.competitionResponse || "—"}</p>
                      </div>
                      <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                        <strong>تحدي قابلية التوسع 10x (N5):</strong>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario2.scalabilityResponse || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Scenario 3 */}
                {activeTab === "s3" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>السيناريو 3: هندسة نموذج العمل والمواءمة المنطقية</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      المسار المسلوك: <code>{selectedParticipant.scenario3.path.join(" → ") || "—"}</code> | الفجوة المنطقية المكتشفة: <strong>{selectedParticipant.scenario3.detectedGapPath}</strong>
                    </p>

                    <h4 style={{ margin: 0 }}>مكونات نموذج العمل الخمسة:</h4>
                    {selectedParticipant.scenario3.businessModel ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.85rem" }}>
                        <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>شرائح العملاء</span>
                          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario3.businessModel.customerSegments}</p>
                        </div>
                        <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>القيمة المقترحة</span>
                          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario3.businessModel.valueProposition}</p>
                        </div>
                        <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>قنوات التوزيع والوصول</span>
                          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario3.businessModel.channels}</p>
                        </div>
                        <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>مصادر الإيرادات</span>
                          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario3.businessModel.revenueStreams}</p>
                        </div>
                        <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>هيكل التكاليف</span>
                          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem" }}>{selectedParticipant.scenario3.businessModel.costStructure}</p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)" }}>لم يتم تقديم نموذج عمل مسجل.</p>
                    )}

                    {selectedParticipant.scenario3.reconciliationAnswer && (
                      <div style={{ backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "1rem", borderRadius: "6px" }}>
                        <h4 style={{ margin: "0 0 0.4rem 0" }}>استجابة معالجة الفجوة المنطقية:</h4>
                        <p style={{ margin: 0, fontSize: "0.9rem" }}>{selectedParticipant.scenario3.reconciliationAnswer}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 5: Scenario 4 */}
                {activeTab === "s4" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>السيناريو 4: اتخاذ القرار تحت الضغط وإدارة المخاطر</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      المسار المسلوك: <code>{selectedParticipant.scenario4.path.join(" → ") || "—"}</code>
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div style={{ border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "6px" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0" }}>قرار الأزمة (60 ثانية):</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem" }}>
                          <div>الخيار المحدد: <strong>{selectedParticipant.scenario4.choice ? `الخيار (${selectedParticipant.scenario4.choice})` : "انتهى الوقت"}</strong></div>
                          <div>انتهاء الوقت (Timeout): <strong style={{ color: selectedParticipant.scenario4.timeout ? "#ef4444" : "#10b981" }}>{selectedParticipant.scenario4.timeout ? "نعم" : "لا"}</strong></div>
                          <div>زمن اتخاذ القرار: <strong>{selectedParticipant.scenario4.decisionTimeFormatted}</strong></div>
                          <div>مسار النتيجة الإجرائية: <code>{selectedParticipant.scenario4.consequenceNode || "—"}</code></div>
                        </div>
                      </div>

                      <div style={{ border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "6px" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0" }}>قرار التعافي وإدارة السمعة (N4):</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem" }}>
                          <div>الخيار المحدد: <strong>{selectedParticipant.scenario4.recoveryChoice ? `الخيار (${selectedParticipant.scenario4.recoveryChoice})` : "—"}</strong></div>
                          <div>الاستراتيجية المعتمدة: <strong>{selectedParticipant.scenario4.recoveryStrategy || "—"}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "0.75rem", borderRadius: "6px" }}>
                      ملاحظة منهجية: حدث <code>CRISIS_START</code> هو مرساة توقيتية تقنية على مستوى الخادم لحساب زمن الاستجابة، ولا يُحسب ضمن محاولات أو إجابات الطالب.
                    </div>
                  </div>
                )}

                {/* Tab 6: Scenario 5 */}
                {activeTab === "s5" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>السيناريو 5: التسويق الرقمي واختبار A/B</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      المسار المسلوك: <code>{selectedParticipant.scenario5.path.join(" → ") || "—"}</code> | المسار التحليلي: <strong>{selectedParticipant.scenario5.analyticalBranch}</strong>
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>عنوان الحملة (أ)</span>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.95rem" }}>{selectedParticipant.scenario5.headlineA || "—"}</p>
                      </div>
                      <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "6px" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>عنوان الحملة (ب)</span>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.95rem" }}>{selectedParticipant.scenario5.headlineB || "—"}</p>
                      </div>
                    </div>

                    <div style={{ border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "6px" }}>
                      <h4 style={{ margin: "0 0 0.5rem 0" }}>قرار إيقاف وتوجيه الحملات:</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem" }}>
                        <div>الحملة المختارة للمتابعة: <strong>الحملة ({selectedParticipant.scenario5.selectedCampaign || "—"})</strong></div>
                        <div>مبررات القرار: <p style={{ margin: "0.3rem 0 0 0", lineHeight: "1.6" }}>{selectedParticipant.scenario5.reasoning || "—"}</p></div>
                        <div>تخصيص الميزانية المتبقية: <strong>{selectedParticipant.scenario5.budgetAllocation}</strong></div>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "0.75rem", borderRadius: "6px" }}>
                      <strong>المعايير الثابتة لنتائج المحاكاة (3 أيام):</strong>
                      <br />الحملة (أ): {selectedParticipant.scenario5.fixedBenchmarks.campaignA}
                      <br />الحملة (ب): {selectedParticipant.scenario5.fixedBenchmarks.campaignB}
                    </div>
                  </div>
                )}

                {/* Tab 7: Chronological Log */}
                {activeTab === "log" && (
                  <div>
                    <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>السجل الزمني لكافة التفاعلات ({selectedParticipant.chronologicalInteractions.length} تفاعل)</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", textAlign: "right" }}>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>س</th>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>العقدة</th>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>نوع التفاعل</th>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>إجابة المشارك</th>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>التصنيف</th>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>الزمن (ms)</th>
                            <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>التالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedParticipant.chronologicalInteractions.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                              <td style={{ padding: "0.5rem" }}>{row.scenario_id ?? 1}</td>
                              <td style={{ padding: "0.5rem" }}><code>{row.node_id}</code></td>
                              <td style={{ padding: "0.5rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "0.15rem 0.4rem",
                                    borderRadius: "4px",
                                    backgroundColor:
                                      row.turn_kind === "evaluated_answer"
                                        ? "rgba(16, 185, 129, 0.15)"
                                        : row.turn_kind === "conversational_support"
                                        ? "rgba(56, 189, 248, 0.15)"
                                        : "rgba(255, 255, 255, 0.08)",
                                  }}
                                >
                                  {row.student_answer === "CRISIS_START"
                                    ? "حدث تقني"
                                    : row.turn_kind || "غير محدد"}
                                </span>
                              </td>
                              <td style={{ padding: "0.5rem", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.student_answer || ""}>
                                {row.student_answer || "—"}
                              </td>
                              <td style={{ padding: "0.5rem" }}>{row.classification || "—"}</td>
                              <td style={{ padding: "0.5rem" }}>{row.decision_time_ms ?? "—"}</td>
                              <td style={{ padding: "0.5rem" }}><code>{row.next_node || "—"}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
