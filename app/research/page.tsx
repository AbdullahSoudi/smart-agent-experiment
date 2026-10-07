"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { FullParticipantReport } from "@/lib/research/report";
import { SCENARIO_DISPLAY_NAMES } from "@/lib/journey";

// Domain-friendly Arabic labels for internal analytical codes
const S3_GAP_LABELS: Record<string, string> = {
  pricing_gap: "فجوة التسعير والقدرة الشرائية للعملاء",
  cost_gap: "فجوة ارتفاع التكاليف مقابل القيمة المقدمة",
  channel_gap: "فجوة قنوات التوزيع والوصول للشريحة",
  coherent: "نموذج عمل متماسك ومتوافق",
  unknown: "غير محدد",
};

const S5_BRANCH_LABELS: Record<string, string> = {
  advanced_roi: "تحليل متقدم للعائد على الاستثمار وتكلفة الاستحواذ (CPA)",
  vanity_metric_correction: "تصحيح الاعتماد على المقاييس الزائفة (عدد الزيارات)",
  calculation_hint: "تلميح حسابي ومساعدة منهجية",
  unknown: "غير محدد",
};

const S4_CHOICE_LABELS: Record<string, string> = {
  A: "الخيار (أ): إيقاف السيرفرات والتواصل المباشر مع العملاء",
  B: "الخيار (ب): عزل السيرفر المتضرر والاستعانة بخبير أمني",
  C: "الخيار (ج): تجاهل التنبيه ومتابعة العمل",
};

export default function ResearcherReportPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<FullParticipantReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "s1" | "s2" | "s3" | "s4" | "s5" | "log"
  >("overview");

  const TAB_CONFIG = [
    { id: "overview", label: "نظرة عامة", color: "#5B5FEF" },
    { id: "s1", label: `السيناريو 1 (${SCENARIO_DISPLAY_NAMES[1]})`, color: "#1AA7EC" },
    { id: "s2", label: `السيناريو 2 (${SCENARIO_DISPLAY_NAMES[2]})`, color: "#7C4DFF" },
    { id: "s3", label: `السيناريو 3 (${SCENARIO_DISPLAY_NAMES[3]})`, color: "#F4B942" },
    { id: "s4", label: `السيناريو 4 (${SCENARIO_DISPLAY_NAMES[4]})`, color: "#FF6B6B" },
    { id: "s5", label: `السيناريو 5 (${SCENARIO_DISPLAY_NAMES[5]})`, color: "#00A99D" },
    { id: "log", label: "السجل الكامل", color: "#182033" },
  ];
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
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
      const list: FullParticipantReport[] = data.participants || [];
      setParticipants(list);
      if (list.length > 0) {
        setSelectedId((prev) => {
          if (prev && list.some((p) => p.summary.sessionId === prev)) return prev;
          return list[0].summary.sessionId;
        });
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      if (showRefreshingSpinner) setIsRefreshing(false);
    }
  }, []);

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
          <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
            جاري التحقق من صلاحيات الباحث العلمي...
          </p>
        </div>
      </main>
    );
  }

  // 2. Unauthenticated: Login Screen
  if (!isAuthenticated) {
    return (
      <main className="viewport-canvas">
        <div
          className="workspace-frame"
          style={{
            maxWidth: "480px",
            margin: "4rem auto",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            padding: "2.25rem 2rem",
            boxShadow: "var(--shadow-workspace)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <header style={{ marginBottom: "1.75rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, color: "var(--color-primary, #5B5FEF)" }}>بوابة الباحث</span>
              <span>·</span>
              <span>دراسة التجربة التتابعية</span>
            </div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary, #151D21)", margin: 0 }}>
              تسجيل دخول الباحث
            </h1>
          </header>

          {!isConfigured && (
            <div
              style={{
                backgroundColor: "rgba(185, 28, 28, 0.08)",
                border: "1px solid rgba(185, 28, 28, 0.25)",
                borderRadius: "10px",
                padding: "0.9rem 1rem",
                marginBottom: "1.5rem",
                color: "#991B1B",
                fontSize: "0.9rem",
                lineHeight: "1.6",
              }}
            >
              <strong>الخدمة غير مهيأة:</strong> لم يتم ضبط متغير البيئة <code>RESEARCHER_REPORT_PASSWORD</code> على الخادم.
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                htmlFor="researcher-password"
                style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary, #151D21)" }}
              >
                كلمة المرور الخاصة بالتقرير:
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
                  height: "44px",
                  padding: "0 1rem",
                  borderRadius: "10px",
                  border: "1px solid var(--border-strong, #CDC6B8)",
                  backgroundColor: "var(--surface-workspace, #F4F1EA)",
                  color: "var(--text-primary, #151D21)",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
            </div>

            {loginError && (
              <p style={{ color: "#B91C1C", fontSize: "0.88rem", margin: 0 }}>
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={!isConfigured || isSubmitting || !password.trim()}
              style={{
                height: "44px",
                padding: "0 1.5rem",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "var(--color-primary, #5B5FEF)",
                color: "var(--text-inverse, #FAF7F0)",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: !isConfigured || isSubmitting ? "not-allowed" : "pointer",
                opacity: !isConfigured || isSubmitting ? 0.6 : 1,
                transition: "background-color 0.15s ease",
              }}
            >
              {isSubmitting ? "جاري التحقق..." : "دخول إلى لوحة الباحث"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Authenticated: Dashboard Calculations
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
    <main
      className="viewport-canvas"
      style={{
        minHeight: "100vh",
        padding: "1.5rem 1rem",
        backgroundColor: "var(--surface-workspace, #F7F8FC)",
        overflowX: "hidden",
      }}
    >
      <div
        className="workspace-frame"
        style={{
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: "transparent",
          borderRadius: "18px",
          padding: "0",
          boxShadow: "var(--shadow-workspace)",
        }}
      >
        {/* Style block for scoped hover/active transitions and responsive layouts */}
        <style dangerouslySetInnerHTML={{ __html: `
          .res-btn-primary {
            height: 38px;
            padding: 0 1rem;
            border-radius: 10px;
            border: none;
            background: var(--gradient-brand, linear-gradient(135deg, #5B5FEF 0%, #7C4DFF 100%));
            color: #FFFFFF;
            box-shadow: 0 3px 10px rgba(91, 95, 239, 0.25);
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.15s ease;
          }
          .res-btn-primary:hover:not(:disabled) {
            background-color: var(--color-primary-hover, #4A4DE6);
            border-color: var(--color-primary-hover, #4A4DE6);
          }
          .res-btn-secondary {
            height: 38px;
            padding: 0 1rem;
            border-radius: 10px;
            border: 1px solid var(--border-strong, #CDC6B8);
            background-color: var(--surface-paper, #FAF8F4);
            color: var(--color-primary, #5B5FEF);
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.15s ease;
          }
          .res-btn-secondary:hover {
            background-color: var(--surface-quiet, #EBE5DB);
            border-color: var(--color-primary, #5B5FEF);
          }
          .res-btn-danger {
            height: 38px;
            padding: 0 0.9rem;
            border-radius: 10px;
            border: 1px solid rgba(185, 28, 28, 0.3);
            background-color: transparent;
            color: #B91C1C;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            transition: all 0.15s ease;
          }
          .res-btn-danger:hover {
            background-color: rgba(185, 28, 28, 0.08);
            border-color: #B91C1C;
          }
          .res-nav-tab {
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: var(--text-secondary, #3D4854);
            font-size: 0.825rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;
          }
          .res-nav-tab:hover {
            background-color: rgba(255, 255, 255, 0.6);
            color: var(--text-primary, #151D21);
          }
          .res-nav-tab.active {
            background-color: var(--color-primary, #5B5FEF);
            color: var(--text-inverse, #FAF7F0);
            box-shadow: 0 2px 6px rgba(27, 77, 62, 0.25);
          }
          .participant-card-item {
            padding: 0.9rem 1rem;
            border-bottom: 1px solid var(--border-subtle, #E0DACF);
            cursor: pointer;
            transition: background-color 0.12s ease;
          }
          .participant-card-item:hover {
            background-color: rgba(91, 95, 239, 0.03);
          }
          .participant-card-item.selected {
            background-color: rgba(91, 95, 239, 0.07);
            border-right: 4px solid var(--color-primary, #5B5FEF);
          }
          @media (max-width: 960px) {
            .research-split-layout {
              grid-template-columns: 1fr !important;
            }
            .res-nav-container {
              max-width: 100%;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
          }
        ` }} />

        {/* Top Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid var(--border-strong, #CDC6B8)",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              <span style={{ fontWeight: 700, color: "var(--color-primary, #5B5FEF)" }}>دراسة تجريبية موضوعية</span>
              <span>·</span>
              <span>لوحة التحليل والمتابعة الأكاديمية</span>
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary, #151D21)", margin: 0 }}>
              سجلات التجربة التتابعية للوكيل الذكي
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="res-btn-primary"
              title="تحديث قائمة المشاركين والبيانات المسجلة"
            >
              <span>{isRefreshing ? "⟳" : "↻"}</span>
              <span>{isRefreshing ? "جاري التحديث..." : "تحديث البيانات"}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="res-btn-secondary"
              title="تصدير سجلات التفاعلات بصيغة CSV كاملة"
            >
              <span>⤓</span>
              <span>تصدير ملف CSV</span>
            </button>

            <button
              onClick={handleLogout}
              className="res-btn-danger"
              title="تسجيل الخروج من لوحة الباحث"
            >
              <span>⎋</span>
              <span>خروج</span>
            </button>
          </div>
        </header>

        {/* Aggregate Summary Cards (Equal Heights & Clear Visual Hierarchy) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Card 1: Total */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-panel)",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "96px",
            }}
          >
            <div style={{ color: "var(--text-secondary, #3D4854)", fontSize: "0.85rem", fontWeight: 600 }}>
              إجمالي المشاركين
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary, #151D21)", lineHeight: 1.1, margin: "0.4rem 0" }}>
              {totalCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted, #546270)" }}>
              ضمن العينة التتابعية
            </div>
          </div>

          {/* Card 2: Completed */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-panel)",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "96px",
            }}
          >
            <div style={{ color: "var(--text-secondary, #3D4854)", fontSize: "0.85rem", fontWeight: 600 }}>
              مكتملون
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0D7A58", lineHeight: 1.1, margin: "0.4rem 0" }}>
              {completedCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted, #546270)" }}>
              أنهوا السيناريوهات الخمسة
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-panel)",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "96px",
            }}
          >
            <div style={{ color: "var(--text-secondary, #3D4854)", fontSize: "0.85rem", fontWeight: 600 }}>
              قيد التنفيذ
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0369A1", lineHeight: 1.1, margin: "0.4rem 0" }}>
              {activeCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted, #546270)" }}>
              في مراحل التجربة المختلفة
            </div>
          </div>

          {/* Card 4: Total Interactions */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-panel)",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "96px",
            }}
          >
            <div style={{ color: "var(--text-secondary, #3D4854)", fontSize: "0.85rem", fontWeight: 600 }}>
              إجمالي التفاعلات
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--accent-brass, #A88746)", lineHeight: 1.1, margin: "0.4rem 0" }}>
              {totalInteractionsCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted, #546270)" }}>
              سجلات حوارية وقرارات مقيّمة
            </div>
          </div>
        </div>

        {/* Main Content Split Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
          className="research-split-layout"
        >
          {/* Left Panel: Participants List */}
          <section
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "18px",
              display: "flex",
              flexDirection: "column",
              maxHeight: "82vh",
              overflow: "hidden",
              boxShadow: "var(--shadow-panel)",
            }}
          >
            {/* Search Input */}
            <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border-subtle, #E0DACF)", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو كود المشارك..."
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-strong, #CDC6B8)",
                  backgroundColor: "var(--surface-paper, #FAF8F4)",
                  color: "var(--text-primary, #151D21)",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredParticipants.length === 0 ? (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted, #546270)", fontSize: "0.9rem" }}>
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredParticipants.map((p) => {
                  const isSelected = p.summary.sessionId === selectedId;
                  const isDone = p.summary.status === "completed";
                  const isRecent = p.summary.freshnessLabel === "نشط مؤخرًا";

                  return (
                    <div
                      key={p.summary.sessionId}
                      onClick={() => setSelectedId(p.summary.sessionId)}
                      className={`participant-card-item ${isSelected ? "selected" : ""}`}
                    >
                      {/* Name & Stored Status */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.35rem",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary, #151D21)" }}>
                          {p.summary.studentName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.74rem",
                            padding: "0.18rem 0.5rem",
                            borderRadius: "6px",
                            backgroundColor: isDone ? "rgba(16, 185, 129, 0.14)" : "rgba(3, 105, 161, 0.12)",
                            color: isDone ? "#0D7A58" : "#0369A1",
                            fontWeight: 700,
                          }}
                        >
                          {isDone ? "مكتمل" : `السيناريو ${p.summary.currentScenario}`}
                        </span>
                      </div>

                      {/* Code, Skills, Interactions */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.78rem",
                          color: "var(--text-muted, #546270)",
                          marginBottom: "0.35rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <code style={{ backgroundColor: "var(--surface-quiet, #EBE5DB)", padding: "1px 5px", borderRadius: "4px" }}>
                          {p.summary.studentCode}
                        </code>
                        <span>·</span>
                        <span>{p.summary.completedSkillsCount}/5 مهارات</span>
                        <span>·</span>
                        <span>{p.summary.totalInteractions} تفاعل</span>
                      </div>

                      {/* Truthful Activity / Duration Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.76rem",
                          color: "var(--text-secondary, #3D4854)",
                        }}
                      >
                        {isDone ? (
                          <span>مدة الجلسة: <strong>{p.summary.durationFormatted}</strong></span>
                        ) : (
                          <span>آخر نشاط: <strong>{p.summary.lastActivityRelative}</strong></span>
                        )}

                        {/* UI Freshness Indicator Pill */}
                        {!isDone && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "4px",
                              backgroundColor: isRecent ? "rgba(16, 185, 129, 0.1)" : "rgba(100, 116, 139, 0.1)",
                              color: isRecent ? "#0D7A58" : "#64748B",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: isRecent ? "#10B981" : "#94A3B8" }} />
                            {p.summary.freshnessLabel}
                          </span>
                        )}
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
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "18px",
              padding: "1.75rem",
              minHeight: "82vh",
              boxShadow: "var(--shadow-panel)",
            }}
          >
            {!selectedParticipant ? (
              <div style={{ textAlign: "center", padding: "5rem 2rem", color: "var(--text-muted, #546270)" }}>
                <p style={{ fontSize: "1.05rem", margin: 0 }}>اختر مشاركاً من القائمة لعرض تحليلاته وسجلاته التفصيلية.</p>
              </div>
            ) : (
              <div>
                {/* Participant Detail Header */}
                <div
                  style={{
                    paddingBottom: "1.25rem",
                    borderBottom: "1px solid var(--border-subtle, #E0DACF)",
                    marginBottom: "1.25rem",
                  }}
                >
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.65rem 0", color: "var(--text-primary, #151D21)" }}>
                    {selectedParticipant.summary.studentName}
                  </h2>

                  {/* Metadata Pills Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      flexWrap: "wrap",
                      fontSize: "0.82rem",
                    }}
                  >
                    {/* Code */}
                    <div style={{ backgroundColor: "var(--surface-quiet, #EBE5DB)", padding: "0.25rem 0.6rem", borderRadius: "6px" }}>
                      كود المشارك: <code style={{ fontWeight: 700 }}>{selectedParticipant.summary.studentCode}</code>
                    </div>

                    {/* Stored Status */}
                    <div
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        backgroundColor: selectedParticipant.summary.status === "completed" ? "rgba(16, 185, 129, 0.14)" : "rgba(3, 105, 161, 0.12)",
                        color: selectedParticipant.summary.status === "completed" ? "#0D7A58" : "#0369A1",
                        fontWeight: 700,
                      }}
                    >
                      الحالة: {selectedParticipant.summary.status === "completed" ? "مكتمل" : "نشط"}
                    </div>

                    {/* UI Freshness Indicator */}
                    {selectedParticipant.summary.status !== "completed" && (
                      <div
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "6px",
                          backgroundColor: selectedParticipant.summary.freshnessLabel === "نشط مؤخرًا" ? "rgba(16, 185, 129, 0.1)" : "rgba(100, 116, 139, 0.1)",
                          color: selectedParticipant.summary.freshnessLabel === "نشط مؤخرًا" ? "#0D7A58" : "#475569",
                          fontSize: "0.8rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: selectedParticipant.summary.freshnessLabel === "نشط مؤخرًا" ? "#10B981" : "#94A3B8" }} />
                        {selectedParticipant.summary.freshnessLabel}
                      </div>
                    )}

                    {/* Completed Skills */}
                    <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", padding: "0.25rem 0.6rem", borderRadius: "6px", color: "var(--text-secondary)" }}>
                      المهارات: <strong>{selectedParticipant.summary.completedSkillsCount} من 5</strong>
                    </div>

                    {/* Truthful Duration Display */}
                    <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", padding: "0.25rem 0.6rem", borderRadius: "6px", color: "var(--text-secondary)" }}>
                      {selectedParticipant.summary.durationLabel}: <strong>{selectedParticipant.summary.durationFormatted}</strong>
                    </div>

                    {/* Last Activity */}
                    <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", padding: "0.25rem 0.6rem", borderRadius: "6px", color: "var(--text-secondary)" }}>
                      آخر نشاط: <strong>{selectedParticipant.summary.lastActivityRelative}</strong>
                    </div>
                  </div>
                </div>

                {/* Scenario Navigation Segmented Tabs */}
                <div
                  className="res-nav-container"
                  style={{
                    display: "flex",
                    gap: "0.3rem",
                    backgroundColor: "var(--surface-quiet, #EBE5DB)",
                    padding: "4px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-subtle, #E0DACF)",
                    marginBottom: "1.5rem",
                  }}
                >
                  {[
                    { id: "overview", label: "نظرة عامة" },
                    { id: "s1", label: `س1: ${SCENARIO_DISPLAY_NAMES[1]}` },
                    { id: "s2", label: `س2: ${SCENARIO_DISPLAY_NAMES[2]}` },
                    { id: "s3", label: `س3: ${SCENARIO_DISPLAY_NAMES[3]}` },
                    { id: "s4", label: `س4: ${SCENARIO_DISPLAY_NAMES[4]}` },
                    { id: "s5", label: `س5: ${SCENARIO_DISPLAY_NAMES[5]}` },
                    { id: "log", label: "السجل الكامل" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`res-nav-tab ${activeTab === tab.id ? "active" : ""}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview */}
                {activeTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div
                      style={{
                        backgroundColor: "var(--surface-workspace, #F4F1EA)",
                        border: "1px solid var(--border-subtle, #E0DACF)",
                        borderRadius: "10px",
                        padding: "1.1rem",
                      }}
                    >
                      <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1.05rem", color: "var(--text-primary)" }}>
                        ملخص السجل والمسارات التتابعية
                      </h3>
                      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.7" }}>
                        <strong>مسار السيناريوهات:</strong> {selectedParticipant.summary.scenarioPathSummary}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        العقدة الحالية المسجلة: <code>{selectedParticipant.summary.currentNode}</code>
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.9rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>الإجابات المقيّمة</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0" }}>{selectedParticipant.summary.evaluatedCount}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>متقدم: {selectedParticipant.summary.advancedCount} · متوسط: {selectedParticipant.summary.mediumCount} · ضعيف: {selectedParticipant.summary.weakCount}</div>
                      </div>

                      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.9rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>طلبات الدعم الحواري</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0" }}>{selectedParticipant.summary.supportCount}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>أسئلة واستيضاحات</div>
                      </div>

                      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.9rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>الحوارات الجانبية</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0" }}>{selectedParticipant.summary.offTopicCount}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>تمت إعادتها للمسار التعليمي</div>
                      </div>

                      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.9rem" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>إجابات عامة/غير مقيّمة</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.25rem 0" }}>{selectedParticipant.summary.nonEvaluatedCount}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>مدخلات نصية بدون حكم رصين</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Scenario 1 */}
                {activeTab === "s1" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>السيناريو 1: {SCENARIO_DISPLAY_NAMES[1]}</h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        المسار المسلوك: <code>{selectedParticipant.scenario1.path.join(" → ") || "—"}</code>
                      </span>
                    </div>

                    {!selectedParticipant.scenario1.visited ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", border: "1px dashed var(--border-strong)", borderRadius: "8px" }}>
                        لم يصل المشارك إلى هذا السيناريو بعد.
                      </div>
                    ) : (
                      <>
                        {selectedParticipant.scenario1.finalOpportunity && (
                          <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 0.4rem 0", color: "var(--color-primary, #5B5FEF)", fontSize: "0.95rem" }}>
                              الفرصة والقيمة الاقتصادية النهائية (العقدة N5):
                            </h4>
                            <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: "1.7", color: "var(--text-primary)" }}>
                              {selectedParticipant.scenario1.finalOpportunity}
                            </p>
                          </div>
                        )}

                        <h4 style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                          الإجابات المقيّمة في السيناريو الأول ({selectedParticipant.scenario1.evaluatedAnswers.length}):
                        </h4>

                        {selectedParticipant.scenario1.evaluatedAnswers.length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>لا توجد إجابات مقيّمة مسجلة في هذا السيناريو.</p>
                        ) : (
                          selectedParticipant.scenario1.evaluatedAnswers.map((ev, i) => (
                            <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "0.9rem", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                  العقدة: <code>{ev.node}</code>
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "4px",
                                    backgroundColor: ev.classification === "advanced" ? "rgba(16, 185, 129, 0.15)" : ev.classification === "medium" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                    color: ev.classification === "advanced" ? "#0D7A58" : ev.classification === "medium" ? "#B45309" : "#B91C1C",
                                  }}
                                >
                                  {ev.classification ? `تصنيف: ${ev.classification}` : "غير مقيّم"}
                                </span>
                              </div>
                              <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.92rem", lineHeight: "1.6", color: "var(--text-primary)" }}>{ev.answer}</p>
                              {ev.feedback && (
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", borderTop: "1px dashed var(--border-subtle)", paddingTop: "0.35rem" }}>
                                  <strong>التغذية الراجعة:</strong> {ev.feedback}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Tab 3: Scenario 2 */}
                {activeTab === "s2" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>السيناريو 2: {SCENARIO_DISPLAY_NAMES[2]}</h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        المسار المسلوك: <code>{selectedParticipant.scenario2.path.join(" → ") || "—"}</code>
                      </span>
                    </div>

                    {!selectedParticipant.scenario2.visited ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", border: "1px dashed var(--border-strong)", borderRadius: "8px" }}>
                        لم يصل المشارك إلى هذا السيناريو بعد.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                          <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 0.4rem 0", color: "#0369A1", fontSize: "0.95rem" }}>الفكرة الأولية (العقدة N1):</h4>
                            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.7", color: selectedParticipant.scenario2.initialIdea ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {selectedParticipant.scenario2.initialIdea || "لا توجد بيانات مسجلة"}
                            </p>
                          </div>

                          <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 0.4rem 0", color: "#0D7A58", fontSize: "0.95rem" }}>الفكرة المعاد بناؤها (العقدة N4):</h4>
                            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.7", color: selectedParticipant.scenario2.rebuiltIdea ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {selectedParticipant.scenario2.rebuiltIdea || "لا توجد بيانات مسجلة"}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {selectedParticipant.scenario2.marketingResponse && (
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.9rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>تحدي الميزانية الصفرية والتسويق (العقدة N2):</strong>
                              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario2.marketingResponse}</p>
                            </div>
                          )}

                          {selectedParticipant.scenario2.competitionResponse && (
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.9rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>الميزة التنافسية أمام الكبار (العقدة N3):</strong>
                              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario2.competitionResponse}</p>
                            </div>
                          )}

                          {selectedParticipant.scenario2.scalabilityResponse && (
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.9rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>تحدي قابلية التوسع 10x (العقدة N5):</strong>
                              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario2.scalabilityResponse}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tab 4: Scenario 3 */}
                {activeTab === "s3" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>السيناريو 3: {SCENARIO_DISPLAY_NAMES[3]}</h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        المسار: <code>{selectedParticipant.scenario3.path.join(" → ") || "—"}</code>
                      </span>
                    </div>

                    {!selectedParticipant.scenario3.visited ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", border: "1px dashed var(--border-strong)", borderRadius: "8px" }}>
                        لم يصل المشارك إلى هذا السيناريو بعد.
                      </div>
                    ) : (
                      <>
                        {/* Diagnostic Gap Presentation: Human Arabic primary, technical code secondary */}
                        <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", border: "1px solid var(--border-subtle)", padding: "0.9rem 1rem", borderRadius: "8px" }}>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>المسار التشخيصي المكتشف:</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "1rem", color: "var(--color-primary, #5B5FEF)" }}>
                              {S3_GAP_LABELS[selectedParticipant.scenario3.detectedGapPath] || selectedParticipant.scenario3.detectedGapPath}
                            </strong>
                            <code style={{ fontSize: "0.78rem", backgroundColor: "var(--surface-quiet)", padding: "2px 6px", borderRadius: "4px" }}>
                              {selectedParticipant.scenario3.detectedGapPath}
                            </code>
                          </div>
                        </div>

                        <h4 style={{ margin: "0.25rem 0 0 0", fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                          مكونات نموذج العمل الخمسة:
                        </h4>

                        {!selectedParticipant.scenario3.businessModel ? (
                          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", border: "1px dashed var(--border-subtle)", borderRadius: "8px" }}>
                            لم يتم تسجيل بطاقة نموذج العمل بعد.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>شرائح العملاء</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario3.businessModel.customerSegments}</p>
                            </div>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>القيمة المقترحة</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario3.businessModel.valueProposition}</p>
                            </div>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>قنوات التوزيع والوصول</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario3.businessModel.channels}</p>
                            </div>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>مصادر الإيرادات</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario3.businessModel.revenueStreams}</p>
                            </div>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>هيكل التكاليف</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario3.businessModel.costStructure}</p>
                            </div>
                          </div>
                        )}

                        {selectedParticipant.scenario3.reconciliationAnswer && (
                          <div style={{ border: "1px solid var(--border-subtle)", padding: "0.9rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                            <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>إجابة التوفيق والمعالجة المنطقية:</strong>
                            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.9rem", lineHeight: "1.6" }}>{selectedParticipant.scenario3.reconciliationAnswer}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Tab 5: Scenario 4 */}
                {activeTab === "s4" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>السيناريو 4: {SCENARIO_DISPLAY_NAMES[4]}</h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        المسار: <code>{selectedParticipant.scenario4.path.join(" → ") || "—"}</code>
                      </span>
                    </div>

                    {!selectedParticipant.scenario4.visited ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", border: "1px dashed var(--border-strong)", borderRadius: "8px" }}>
                        لم يصل المشارك إلى هذا السيناريو بعد.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                          {/* Crisis Decision Box */}
                          <div style={{ border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--text-primary)" }}>قرار الاستجابة الفورية للأزمة:</h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.88rem" }}>
                              <div>
                                القرار المعتمد:{" "}
                                <strong>
                                  {selectedParticipant.scenario4.choice
                                    ? S4_CHOICE_LABELS[selectedParticipant.scenario4.choice] || selectedParticipant.scenario4.choice
                                    : selectedParticipant.scenario4.timeout
                                    ? "انتهت المهلة الزمنية (60 ثانية) دون قرار"
                                    : "لم يتخذ قراراً بعد"}
                                </strong>
                              </div>
                              <div>
                                زمن القرار: <strong>{selectedParticipant.scenario4.decisionTimeFormatted}</strong>
                              </div>
                              <div>
                                عقدة التبعات الناتجة: <code>{selectedParticipant.scenario4.consequenceNode || "—"}</code>
                              </div>
                            </div>
                          </div>

                          {/* Recovery Decision Box */}
                          <div style={{ border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--text-primary)" }}>استراتيجية التعافي طويلة المدى:</h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.88rem" }}>
                              <div>
                                خيار التعافي:{" "}
                                <strong>
                                  {selectedParticipant.scenario4.recoveryChoice
                                    ? `الخيار (${selectedParticipant.scenario4.recoveryChoice})`
                                    : "لا توجد بيانات مسجلة"}
                                </strong>
                              </div>
                              <div>
                                الاستراتيجية المعتمدة:{" "}
                                <span>{selectedParticipant.scenario4.recoveryStrategy || "لا توجد بيانات مسجلة"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", backgroundColor: "var(--surface-workspace, #F4F1EA)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                          ملاحظة منهجية: حدث <code>CRISIS_START</code> هو مرساة توقيتية تقنية على مستوى الخادم لحساب زمن الاستجابة الفعلي، ولا يُحسب ضمن محاولات أو إجابات الطالب.
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tab 6: Scenario 5 */}
                {activeTab === "s5" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>السيناريو 5: {SCENARIO_DISPLAY_NAMES[5]}</h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        المسار: <code>{selectedParticipant.scenario5.path.join(" → ") || "—"}</code>
                      </span>
                    </div>

                    {!selectedParticipant.scenario5.visited ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", border: "1px dashed var(--border-strong)", borderRadius: "8px" }}>
                        لم يصل المشارك إلى هذا السيناريو بعد.
                      </div>
                    ) : (
                      <>
                        {/* Analytical Branch Primary Arabic, Technical Code Secondary */}
                        <div style={{ backgroundColor: "var(--surface-workspace, #F4F1EA)", border: "1px solid var(--border-subtle)", padding: "0.9rem 1rem", borderRadius: "8px" }}>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>المسار التحليلي لقرار الميزانية:</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "1rem", color: "var(--color-primary, #5B5FEF)" }}>
                              {S5_BRANCH_LABELS[selectedParticipant.scenario5.analyticalBranch] || selectedParticipant.scenario5.analyticalBranch}
                            </strong>
                            <code style={{ fontSize: "0.78rem", backgroundColor: "var(--surface-quiet)", padding: "2px 6px", borderRadius: "4px" }}>
                              {selectedParticipant.scenario5.analyticalBranch}
                            </code>
                          </div>
                        </div>

                        {/* Campaign Headlines (Clean presentation, no giant empty boxes) */}
                        {selectedParticipant.scenario5.headlineA || selectedParticipant.scenario5.headlineB ? (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem 1rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>عنوان الحملة (أ)</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.92rem", lineHeight: "1.6" }}>{selectedParticipant.scenario5.headlineA || "لا توجد بيانات مسجلة"}</p>
                            </div>
                            <div style={{ border: "1px solid var(--border-subtle)", padding: "0.85rem 1rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>عنوان الحملة (ب)</span>
                              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.92rem", lineHeight: "1.6" }}>{selectedParticipant.scenario5.headlineB || "لا توجد بيانات مسجلة"}</p>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: "0.85rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "8px", fontSize: "0.88rem", color: "var(--text-muted)" }}>
                            لم يتم تسجيل عناوين الحملات A/B في هذا السيناريو بعد.
                          </div>
                        )}

                        {/* Decision & Reasoning */}
                        <div style={{ border: "1px solid var(--border-subtle)", padding: "1rem", borderRadius: "8px", backgroundColor: "var(--surface-workspace, #F4F1EA)" }}>
                          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>قرار إيقاف وتوجيه الحملات:</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.88rem" }}>
                            <div>
                              الحملة المختارة للمتابعة:{" "}
                              <strong>
                                {selectedParticipant.scenario5.selectedCampaign
                                  ? `الحملة (${selectedParticipant.scenario5.selectedCampaign})`
                                  : "لا توجد بيانات مسجلة"}
                              </strong>
                            </div>
                            <div>
                              مبررات القرار:
                              <p style={{ margin: "0.25rem 0 0 0", lineHeight: "1.6", color: "var(--text-primary)" }}>
                                {selectedParticipant.scenario5.reasoning || "لا توجد مبررات مسجلة"}
                              </p>
                            </div>
                            <div>
                              تخصيص الميزانية المتبقية: <strong>{selectedParticipant.scenario5.budgetAllocation || "لا توجد بيانات"}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Fixed Simulation Benchmarks */}
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", backgroundColor: "var(--surface-workspace, #F4F1EA)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                          <strong>المعايير المنهجية الثابتة لنتائج المحاكاة (3 أيام):</strong>
                          <br />الحملة (أ): {selectedParticipant.scenario5.fixedBenchmarks.campaignA}
                          <br />الحملة (ب): {selectedParticipant.scenario5.fixedBenchmarks.campaignB}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tab 7: Chronological Log */}
                {activeTab === "log" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                        السجل الزمني لكافة التفاعلات ({selectedParticipant.chronologicalInteractions.length} تفاعل)
                      </h3>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>مرتبة تصاعدياً بحسب زمن الإنشاء</span>
                    </div>

                    <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--surface-quiet, #EBE5DB)", textAlign: "right" }}>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>س</th>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>العقدة</th>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>نوع التفاعل</th>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>إجابة المشارك</th>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>التصنيف</th>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>الزمن (ms)</th>
                            <th style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border-strong)" }}>التالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedParticipant.chronologicalInteractions.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: idx % 2 === 0 ? "var(--surface-paper)" : "var(--surface-workspace)" }}>
                              <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700 }}>{row.scenario_id ?? 1}</td>
                              <td style={{ padding: "0.55rem 0.75rem" }}><code>{row.node_id}</code></td>
                              <td style={{ padding: "0.55rem 0.75rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.74rem",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    backgroundColor:
                                      row.student_answer === "CRISIS_START"
                                        ? "rgba(100, 116, 139, 0.12)"
                                        : row.turn_kind === "evaluated_answer"
                                        ? "rgba(16, 185, 129, 0.14)"
                                        : row.turn_kind === "conversational_support"
                                        ? "rgba(3, 105, 161, 0.12)"
                                        : "rgba(245, 158, 11, 0.12)",
                                    color:
                                      row.student_answer === "CRISIS_START"
                                        ? "#475569"
                                        : row.turn_kind === "evaluated_answer"
                                        ? "#0D7A58"
                                        : row.turn_kind === "conversational_support"
                                        ? "#0369A1"
                                        : "#B45309",
                                    fontWeight: 600,
                                  }}
                                >
                                  {row.student_answer === "CRISIS_START"
                                    ? "مرساة تقنية (بدء الأزمة)"
                                    : row.turn_kind === "evaluated_answer"
                                    ? "إجابة مقيّمة"
                                    : row.turn_kind === "conversational_support"
                                    ? "استفسار ودعم"
                                    : row.turn_kind === "off_topic"
                                    ? "خارج الموضوع"
                                    : row.turn_kind || "غير محدد"}
                                </span>
                              </td>
                              <td style={{ padding: "0.55rem 0.75rem", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.student_answer || ""}>
                                {row.student_answer || "—"}
                              </td>
                              <td style={{ padding: "0.55rem 0.75rem" }}>
                                {row.classification ? (
                                  <span style={{ fontWeight: 600, color: row.classification === "advanced" ? "#0D7A58" : row.classification === "medium" ? "#B45309" : "#B91C1C" }}>
                                    {row.classification}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td style={{ padding: "0.55rem 0.75rem" }}>{row.decision_time_ms ?? "—"}</td>
                              <td style={{ padding: "0.55rem 0.75rem" }}><code>{row.next_node || "—"}</code></td>
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
