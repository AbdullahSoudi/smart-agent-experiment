"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  NodeId,
  START_NODE_ID,
  getScenarioNode,
  SCENARIO_1_CANONICAL_OPENING,
} from "@/lib/scenario";
import {
  MAX_STUDENT_ANSWER_LENGTH,
  ANSWER_TOO_LONG_ERROR,
} from "@/lib/validation";
import {
  ScenarioId,
  getJourneyProgress,
  getScenarioMeta,
} from "@/lib/journey";

interface ChatMessage {
  id: string;
  sender: "assistant" | "student";
  text: string;
}

export default function ChatPage() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<NodeId>(START_NODE_ID);
  const [scenarioVersion, setScenarioVersion] = useState<string>("2.0-dev");
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [currentScenario, setCurrentScenario] = useState<ScenarioId>(1);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [autoContinueTrigger, setAutoContinueTrigger] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);

  // Auto-scroll helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  // Session restore & bootstrap
  useEffect(() => {
    const activeSessionId = sessionStorage.getItem("experiment_session_id");

    if (!activeSessionId) {
      router.replace("/");
      return;
    }

    setSessionId(activeSessionId);

    const restoreSession = async () => {
      try {
        const res = await fetch("/api/session/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSessionId }),
        });

        if (!res.ok) {
          router.replace("/");
          return;
        }

        const data = await res.json();
        const activeNode: NodeId = data.currentNode;
        const version: string = data.scenarioVersion || "2.0-dev";
        const scenarioNum: ScenarioId =
          typeof data.currentScenario === "number" &&
          data.currentScenario >= 1 &&
          data.currentScenario <= 5
            ? (data.currentScenario as ScenarioId)
            : 1;

        setScenarioVersion(version);
        setCurrentNodeId(activeNode);
        setStudentName(data.studentName || null);
        setStudentCode(data.studentCode || null);
        setCurrentScenario(scenarioNum);

        if (activeNode === "END" || data.status === "completed") {
          router.replace("/complete");
          return;
        }

        // Reconstruct conversation stream from history
        const restoredMessages: ChatMessage[] = [];
        let msgIdCounter = 1;

        // Opening prompt of START_NODE_ID
        const startNode = getScenarioNode(START_NODE_ID, version);
        const initialText =
          version === "2.0-dev" && startNode.prompt
            ? `${SCENARIO_1_CANONICAL_OPENING}\n\n${startNode.prompt}`
            : startNode.prompt;

        if (initialText) {
          restoredMessages.push({
            id: `msg-${msgIdCounter++}`,
            sender: "assistant",
            text: initialText,
          });
        }

        let trackedNode = START_NODE_ID;

        if (Array.isArray(data.history) && data.history.length > 0) {
          for (const item of data.history) {
            // Student message
            if (item.studentAnswer) {
              restoredMessages.push({
                id: `msg-${msgIdCounter++}`,
                sender: "student",
                text: item.studentAnswer,
              });
            }

            // Assistant response
            if (item.feedback) {
              restoredMessages.push({
                id: `msg-${msgIdCounter++}`,
                sender: "assistant",
                text: item.feedback,
              });
            }

            // If node transitioned to a different node, show that node's prompt
            if (item.nextNode && item.nextNode !== item.nodeId) {
              trackedNode = item.nextNode;
              if (trackedNode !== "END") {
                const nextNodeDef = getScenarioNode(trackedNode, version);
                const nextText = nextNodeDef.prompt || nextNodeDef.message;
                if (nextText) {
                  restoredMessages.push({
                    id: `msg-${msgIdCounter++}`,
                    sender: "assistant",
                    text: nextText,
                  });
                }
              }
            }
          }
        }

        // If trackedNode is different from activeNode and not already displayed
        if (trackedNode !== activeNode) {
          const currentNodeDef = getScenarioNode(activeNode, version);
          const currentText = currentNodeDef.prompt || currentNodeDef.message;
          if (currentText) {
            restoredMessages.push({
              id: `msg-${msgIdCounter++}`,
              sender: "assistant",
              text: currentText,
            });
          }
        }

        setMessages(restoredMessages);
        setIsRestoring(false);
      } catch {
        router.replace("/");
      }
    };

    restoreSession();
  }, [router]);

  // Handle N2_H auto-continue
  useEffect(() => {
    if (isRestoring || currentNodeId !== "N2_H" || !sessionId) {
      return;
    }

    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (isCancelled || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/n2-h/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          throw new Error("Failed to auto-continue");
        }

        const data = await res.json();
        const nextNode: NodeId = data.nextNode;
        setCurrentNodeId(nextNode);

        if (nextNode === "END") {
          router.replace("/complete");
          return;
        }

        const nextDef = getScenarioNode(nextNode, scenarioVersion);
        if (nextDef.prompt) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-next`,
              sender: "assistant",
              text: nextDef.prompt || "",
            },
          ]);
        }
      } catch {
        setErrorMessage("تعذر المتابعة تلقائيًا. يرجى الضغط على زر المتابعة.");
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }, 1800);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentNodeId, sessionId, isRestoring, autoContinueTrigger, router, scenarioVersion]);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStudentAnswer(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Submit route dispatcher
  const getNodeSubmitEndpoint = (nodeId: NodeId): string => {
    switch (nodeId) {
      case "N1":
        return "/api/n1/submit";
      case "N1_H":
        return "/api/n1-h/submit";
      case "N1_F":
        return "/api/n1-f/submit";
      case "N2":
        return "/api/n2/submit";
      case "N2_H":
        return "/api/n2-h/submit";
      case "N3":
        return "/api/n3/submit";
      case "N3_H":
        return "/api/n3-h/submit";
      case "N4":
        return "/api/n4/submit";
      case "N4_REV":
        return "/api/n4-rev/submit";
      case "N4_H":
        return "/api/n4-h/submit";
      case "N5":
        return "/api/n5/submit";
      case "N5_H":
        return "/api/n5-h/submit";
      default:
        throw new Error(`Unhandled submit endpoint for node: ${nodeId}`);
    }
  };

  // Free-text submit handler
  const handleSendMessage = async () => {
    const trimmed = studentAnswer.trim();
    if (!trimmed || isSubmitting || !sessionId) {
      return;
    }

    if (trimmed.length > MAX_STUDENT_ANSWER_LENGTH) {
      setErrorMessage(ANSWER_TOO_LONG_ERROR);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const endpoint = getNodeSubmitEndpoint(currentNodeId);

    // Optimistically append student message
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-user`, sender: "student", text: trimmed },
    ]);
    setStudentAnswer("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "تعذر إرسال الإجابة. حاول مرة أخرى.");
        return;
      }

      // Append assistant conversational response
      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-assistant`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }

      const nextNode: NodeId = data.nextNode;
      const prevNode = currentNodeId;
      setCurrentNodeId(nextNode);

      // Terminal node
      if (nextNode === "END") {
        router.replace("/complete");
        return;
      }

      // If transition moved to a new node, append that node's prompt
      if (nextNode !== prevNode) {
        const nextDef = getScenarioNode(nextNode, scenarioVersion);
        const nextText = nextDef.prompt || nextDef.message;
        if (nextText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-next`,
              sender: "assistant",
              text: nextText,
            },
          ]);
        }
      }
    } catch {
      setErrorMessage("تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Quick reply handler (N1_F)
  const handleQuickChoice = async (choiceText: string) => {
    if (isSubmitting || !sessionId) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-user`, sender: "student", text: choiceText },
    ]);

    try {
      const res = await fetch("/api/n1-f/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, choice: choiceText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "تعذر إرسال الاختيار. حاول مرة أخرى.");
        return;
      }

      const nextNode: NodeId = data.nextNode;
      setCurrentNodeId(nextNode);

      if (nextNode === "END") {
        router.replace("/complete");
        return;
      }

      const nextDef = getScenarioNode(nextNode, scenarioVersion);
      if (nextDef.prompt) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-next`,
            sender: "assistant",
            text: nextDef.prompt || "",
          },
        ]);
      }
    } catch {
      setErrorMessage("تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeNodeDef = getScenarioNode(currentNodeId, scenarioVersion);
  const isN1F = currentNodeId === "N1_F";
  const isN2H = currentNodeId === "N2_H";

  const journeyProgress = getJourneyProgress(currentScenario);
  const activeSkillMeta = getScenarioMeta(currentScenario);

  return (
    <div className="mentor-chat-viewport" dir="rtl">
      {/* Mentor Header with Identity */}
      <header className="mentor-chat-header">
        <div className="mentor-chat-header-content">
          <div className="mentor-brand">
            <div className="mentor-avatar-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.1 5 7.4V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.6c3-1.3 5-4.1 5-7.4a8 8 0 0 0-8-8z" />
                <path d="M10 14h4" />
              </svg>
            </div>
            <div className="mentor-title-group">
              <h1 className="mentor-title">المرشد الريادي الذكي</h1>
              <div className="mentor-status-badge">
                <span className="mentor-status-dot" aria-hidden="true" />
                <span className="mentor-status-text">جلسة نشطة</span>
              </div>
            </div>
          </div>

          {/* Participant subtle identity */}
          {studentName && (
            <div className="mentor-chat-header-user">
              <span className="mentor-user-greeting">أهلاً، {studentName}</span>
              {studentCode && (
                <span className="mentor-user-code">{studentCode}</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Five-Skill Sequential Journey Progress Strip */}
      <nav className="journey-progress-strip" aria-label="مسار المهارات الريادية">
        <div className="journey-progress-container">
          <div className="journey-active-badge">
            <span className="journey-kicker">المهارة الحالية:</span>
            <span className="journey-active-title">
              {activeSkillMeta?.skillTitle || "اكتشاف الفرص الرقمية"}
            </span>
          </div>
          <div className="journey-steps-chips" role="list">
            {journeyProgress.map((item) => (
              <div
                key={item.id}
                role="listitem"
                className={`journey-step-chip journey-step-${item.state}`}
                title={item.skillTitle}
              >
                <span className="step-marker" aria-hidden="true">
                  {item.state === "completed"
                    ? "✓"
                    : item.state === "active"
                    ? "●"
                    : "○"}
                </span>
                <span className="step-title-text">{item.skillTitle}</span>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Conversation Stream */}
      <main className="mentor-chat-main" aria-label="محادثة الإرشاد الذكي">
        <div className="mentor-stream-container">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message-row chat-message-${msg.sender}`}
            >
              {msg.sender === "assistant" && (
                <div className="bubble-avatar" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
              )}
              <div className="chat-bubble">
                <p className="bubble-text">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Thinking Indicator */}
          {isSubmitting && (
            <div className="chat-message-row chat-message-assistant">
              <div className="bubble-avatar" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <div className="chat-bubble chat-bubble-thinking">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-label">المرشد يفكر...</span>
              </div>
            </div>
          )}

          {/* Quick Reply Choices for N1_F */}
          {isN1F && !isSubmitting && (
            <div className="quick-reply-container" role="group" aria-label="خيارات المتابعة">
              {"choices" in activeNodeDef && Array.isArray(activeNodeDef.choices) ? (
                activeNodeDef.choices.map((choice: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-choice-chip"
                    onClick={() => handleQuickChoice(choice)}
                    disabled={isSubmitting}
                  >
                    {choice}
                  </button>
                ))
              ) : null}
            </div>
          )}

          {/* Auto-continue helper for N2_H if needed */}
          {isN2H && errorMessage && (
            <div className="retry-container">
              <button
                type="button"
                className="btn-mentor-action"
                onClick={() => setAutoContinueTrigger((c) => c + 1)}
              >
                متابعة الخطوة التالية
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Sticky Bottom Composer */}
      <footer className="mentor-chat-composer-bar">
        <div className="composer-inner">
          {errorMessage && (
            <div className="composer-error-banner" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          {!isN1F && !isN2H ? (
            <div className="composer-input-wrapper">
              <textarea
                ref={textareaRef}
                id="mentor-answer-input"
                className="mentor-composer-textarea"
                placeholder="اكتب إجابتك أو سؤالك أو اطلب توضيح..."
                rows={1}
                value={studentAnswer}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                maxLength={MAX_STUDENT_ANSWER_LENGTH}
                aria-label="رسالتك للمرشد الذكي"
              />

              <div className="composer-actions">
                <span className="char-counter" aria-live="polite">
                  {studentAnswer.length}/{MAX_STUDENT_ANSWER_LENGTH}
                </span>
                <button
                  type="button"
                  id="send-message-button"
                  className="btn-mentor-send"
                  onClick={handleSendMessage}
                  disabled={isSubmitting || !studentAnswer.trim()}
                  aria-label="إرسال الرسالة"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transform: "rotate(180deg)" }}>
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span className="btn-send-label">إرسال</span>
                </button>
              </div>
            </div>
          ) : isN1F ? (
            <div className="composer-hint-banner">
              <span>اختر أحد الخيارات أعلاه للمتابعة</span>
            </div>
          ) : (
            <div className="composer-hint-banner">
              <span>جاري الانتقال للخطوة التالية...</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}