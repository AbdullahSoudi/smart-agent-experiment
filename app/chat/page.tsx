"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
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
import {
  SCENARIO_2_CANONICAL_OPENING,
} from "@/lib/scenarios/scenario-2";
import {
  SCENARIO_3_CANONICAL_OPENING,
  BUSINESS_MODEL_LABELS,
  type BusinessModelBlocks,
  deserializeBusinessModel,
  isStructuredBusinessModel,
  formatBusinessModelDisplay,
} from "@/lib/scenarios/scenario-3";
import { getScenarioNodeByContext } from "@/lib/scenarios/registry";

interface ChatMessage {
  id: string;
  sender: "assistant" | "student";
  text: string;
}

export default function ChatPage() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string>(START_NODE_ID);
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

  // S3 structured inputs state
  const [s3Blocks, setS3Blocks] = useState<BusinessModelBlocks>({
    customerSegments: "",
    valueProposition: "",
    channels: "",
    revenueStreams: "",
    costStructure: "",
  });
  const [showS3Support, setShowS3Support] = useState(false);
  const [s3SupportQuery, setS3SupportQuery] = useState("");
  const [s3Completed, setS3Completed] = useState(false);

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
        const activeNode: string = data.currentNode;
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

        // Historical sessions complete immediately if at END
        if (version !== "2.0-dev" && (activeNode === "END" || data.status === "completed")) {
          router.replace("/complete");
          return;
        }

        // Sequential journey: Check if at S3 END (temporary boundary)
        if (scenarioNum === 3 && activeNode === "END") {
          setS3Completed(true);
        }

        // Reconstruct conversation stream from history
        const restoredMessages: ChatMessage[] = [];
        let msgIdCounter = 1;

        // Opening prompt of Scenario 1
        const startNodeS1 = getScenarioNode(START_NODE_ID, version);
        const initialTextS1 =
          version === "2.0-dev" && startNodeS1.prompt
            ? `${SCENARIO_1_CANONICAL_OPENING}\n\n${startNodeS1.prompt}`
            : startNodeS1.prompt;

        if (initialTextS1) {
          restoredMessages.push({
            id: `msg-${msgIdCounter++}`,
            sender: "assistant",
            text: initialTextS1,
          });
        }

        let trackedScenario = 1;
        let trackedNode = START_NODE_ID;

        if (Array.isArray(data.history) && data.history.length > 0) {
          for (const item of data.history) {
            const itemScenario = item.scenarioId || 1;

            // Check if scenario advanced between interactions
            if (itemScenario > trackedScenario) {
              for (let s = trackedScenario + 1; s <= itemScenario; s++) {
                if (s === 2) {
                  restoredMessages.push({
                    id: `msg-${msgIdCounter++}`,
                    sender: "assistant",
                    text: SCENARIO_2_CANONICAL_OPENING,
                  });
                } else if (s === 3) {
                  restoredMessages.push({
                    id: `msg-${msgIdCounter++}`,
                    sender: "assistant",
                    text: SCENARIO_3_CANONICAL_OPENING,
                  });
                }
              }
              trackedScenario = itemScenario;
            }

            // Student message (format structured model if JSON)
            if (item.studentAnswer) {
              let studentDisplayText = item.studentAnswer;
              if (isStructuredBusinessModel(item.studentAnswer)) {
                const parsedBlocks = deserializeBusinessModel(item.studentAnswer);
                if (parsedBlocks) {
                  studentDisplayText = formatBusinessModelDisplay(parsedBlocks);
                }
              }
              restoredMessages.push({
                id: `msg-${msgIdCounter++}`,
                sender: "student",
                text: studentDisplayText,
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

            // If node transitioned within scenario
            if (item.nextNode && item.nextNode !== item.nodeId) {
              trackedNode = item.nextNode;
              if (trackedNode !== "END") {
                const nextNodeDef = getScenarioNodeByContext(
                  itemScenario,
                  trackedNode,
                  version
                );
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

        // If scenario has advanced past the last interaction
        if (scenarioNum > trackedScenario) {
          for (let s = trackedScenario + 1; s <= scenarioNum; s++) {
            if (s === 2) {
              restoredMessages.push({
                id: `msg-${msgIdCounter++}`,
                sender: "assistant",
                text: SCENARIO_2_CANONICAL_OPENING,
              });
            } else if (s === 3) {
              restoredMessages.push({
                id: `msg-${msgIdCounter++}`,
                sender: "assistant",
                text: SCENARIO_3_CANONICAL_OPENING,
              });
            }
          }
        } else if (scenarioNum === trackedScenario && trackedNode !== activeNode && activeNode !== "END") {
          const currentNodeDef = getScenarioNodeByContext(
            scenarioNum,
            activeNode,
            version
          );
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

  // Handle N2_H auto-continue for Scenario 1
  useEffect(() => {
    if (isRestoring || currentScenario !== 1 || currentNodeId !== "N2_H" || !sessionId) {
      return;
    }

    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (isCancelled || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/n2-h/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          throw new Error("Failed to auto-continue");
        }

        const data = await res.json();
        const nextNode: string = data.nextNode;
        setCurrentNodeId(nextNode);

        if (nextNode === "END") {
          await advanceScenario(1);
          return;
        }

        const nextDef = getScenarioNode(nextNode as any, scenarioVersion);
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
        setErrorMessage("تعذر المتابعة التلقائية. يرجى إعادة المحاولة.");
      } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    }, 1500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentNodeId, sessionId, isRestoring, scenarioVersion, autoContinueTrigger, currentScenario]);

  // Advance scenario helper
  const advanceScenario = async (fromScenario: ScenarioId) => {
    if (!sessionId) return;
    try {
      const advRes = await fetch("/api/session/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!advRes.ok) {
        throw new Error("Failed to advance scenario");
      }

      const advData = await advRes.json();
      const nextScenario: ScenarioId = advData.currentScenario;
      const nextNode: string = advData.currentNode;

      setCurrentScenario(nextScenario);
      setCurrentNodeId(nextNode);

      if (fromScenario === 1 && nextScenario === 2) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s2-open`,
            sender: "assistant",
            text: SCENARIO_2_CANONICAL_OPENING,
          },
        ]);
      } else if (fromScenario === 2 && nextScenario === 3) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s3-open`,
            sender: "assistant",
            text: SCENARIO_3_CANONICAL_OPENING,
          },
        ]);
      } else if (fromScenario === 3) {
        setS3Completed(true);
      }
    } catch {
      setErrorMessage("تعذر الانتقال للسيناريو التالي تلقائياً. أعد تحديث الصفحة.");
    }
  };
  // Quick choice handler for S1 N1_F
  const handleQuickChoice = async (choiceText: string) => {
    if (isSubmitting || isSubmittingRef.current || !sessionId) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student`,
        sender: "student",
        text: choiceText,
      },
    ]);

    try {
      const res = await fetch("/api/n1-f/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, choice: choiceText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل إرسال الخيار");
      }

      const data = await res.json();
      const nextNode: string = data.nextNode;
      setCurrentNodeId(nextNode);

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-feedback`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }

      if (nextNode !== "END") {
        const nextDef = getScenarioNode(nextNode as any, scenarioVersion);
        const promptText = nextDef.prompt || nextDef.message;
        if (promptText) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-next`,
              sender: "assistant",
              text: promptText,
            },
          ]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Submit handler for normal free-text answers
  const handleSendMessage = async () => {
    const trimmed = studentAnswer.trim();
    if (!trimmed || isSubmitting || isSubmittingRef.current || !sessionId) return;

    if (trimmed.length > MAX_STUDENT_ANSWER_LENGTH) {
      setErrorMessage(ANSWER_TOO_LONG_ERROR);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student`,
        sender: "student",
        text: trimmed,
      },
    ]);
    setStudentAnswer("");

    try {
      let res: Response;

      // Dispatch to appropriate scenario route
      if (currentScenario === 2) {
        res = await fetch("/api/s2/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answer: trimmed }),
        });
      } else if (currentScenario === 3) {
        res = await fetch("/api/s3/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answer: trimmed }),
        });
      } else {
        // Scenario 1 routes
        const endpoint =
          currentNodeId === "N1"
            ? "/api/n1/submit"
            : currentNodeId === "N1_H"
            ? "/api/n1-h/submit"
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
            : currentNodeId === "N5"
            ? "/api/n5/submit"
            : currentNodeId === "N5_H"
            ? "/api/n5-h/submit"
            : "/api/n1/submit";

        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, answer: trimmed }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل إرسال الإجابة");
      }

      const data = await res.json();
      const nextNode: string = data.nextNode;
      const staySameNode = nextNode === currentNodeId;

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-feedback`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }

      if (!staySameNode) {
        setCurrentNodeId(nextNode);

        if (nextNode === "END") {
          if (scenarioVersion === "2.0-dev") {
            await advanceScenario(currentScenario);
          } else {
            try {
              await fetch("/api/session/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
              });
            } catch {
              // Non-blocking
            }
            router.replace("/complete");
          }
          return;
        }

        const nextDef = getScenarioNodeByContext(
          currentScenario,
          nextNode,
          scenarioVersion
        );
        const nextPrompt = nextDef.prompt || nextDef.message;
        if (nextPrompt) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-next`,
              sender: "assistant",
              text: nextPrompt,
            },
          ]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إرسال الإجابة. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Submit handler for Scenario 3 structured 5 blocks
  const handleS3BlocksSubmit = async () => {
    if (
      !s3Blocks.customerSegments.trim() ||
      !s3Blocks.valueProposition.trim() ||
      !s3Blocks.channels.trim() ||
      !s3Blocks.revenueStreams.trim() ||
      !s3Blocks.costStructure.trim() ||
      isSubmitting ||
      isSubmittingRef.current ||
      !sessionId
    ) {
      setErrorMessage("يرجى ملء جميع الكتل الخمس لنموذج العمل التجاري.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    // Display formatted card in conversation stream
    const displayCard = formatBusinessModelDisplay(s3Blocks);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student`,
        sender: "student",
        text: displayCard,
      },
    ]);

    try {
      const res = await fetch("/api/s3/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          blocks: s3Blocks,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل إرسال نموذج العمل");
      }

      const data = await res.json();
      const nextNode: string = data.nextNode;
      const staySameNode = nextNode === currentNodeId;

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-feedback`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }

      if (!staySameNode) {
        setCurrentNodeId(nextNode);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إرسال نموذج العمل. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Submit handler for S3 support question during N1
  const handleS3SupportSubmit = async () => {
    const trimmed = s3SupportQuery.trim();
    if (!trimmed || isSubmitting || isSubmittingRef.current || !sessionId) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student`,
        sender: "student",
        text: trimmed,
      },
    ]);
    setS3SupportQuery("");

    try {
      const res = await fetch("/api/s3/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer: trimmed }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل إرسال السؤال");
      }

      const data = await res.json();
      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-feedback`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إرسال السؤال. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStudentAnswer(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };
  const activeNodeDef = getScenarioNodeByContext(
    currentScenario,
    currentNodeId,
    scenarioVersion
  );

  const isN1F = currentScenario === 1 && currentNodeId === "N1_F";
  const isN2H = currentScenario === 1 && currentNodeId === "N2_H";
  const isS3Structured = currentScenario === 3 && currentNodeId === "N1" && !s3Completed;

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
                <p className="bubble-text" style={{ whiteSpace: "pre-line" }}>{msg.text}</p>
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

          {/* Quick Reply Choices for S1 N1_F */}
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

          {/* Auto-continue helper for S1 N2_H if needed */}
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

          {/* S3 Completion Temporary Boundary Notice */}
          {s3Completed && (
            <div className="s3-completed-notice" role="status">
              <div className="s3-completed-icon">✓</div>
              <div className="s3-completed-text">
                <h3>أحسنت! لقد أتممت بنجاح السيناريو الثالث: بناء وتخطيط نموذج العمل التجاري.</h3>
                <p>تم حفظ تقدمك في هذه المرحلة بنجاح ضمن مسار التجربة.</p>
              </div>
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

          {/* S3 N1 Structured 5-Block Input */}
          {isS3Structured ? (
            <div className="s3-structured-composer">
              <div className="s3-composer-header">
                <h2 className="s3-composer-title">تعبئة لوحة نموذج العمل التجاري</h2>
                <button
                  type="button"
                  className="btn-s3-support-toggle"
                  onClick={() => setShowS3Support(!showS3Support)}
                >
                  {showS3Support ? "إغلاق الاستفسار" : "اسأل المرشد لتوضيح أحد المفاهيم"}
                </button>
              </div>

              {showS3Support && (
                <div className="s3-support-inline">
                  <input
                    type="text"
                    className="s3-support-input"
                    placeholder="اكتب سؤالك أو المصطلح الذي تريد توضيحه..."
                    value={s3SupportQuery}
                    onChange={(e) => setS3SupportQuery(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="btn-mentor-action"
                    onClick={handleS3SupportSubmit}
                    disabled={isSubmitting || !s3SupportQuery.trim()}
                  >
                    إرسال السؤال
                  </button>
                </div>
              )}

              <div className="s3-blocks-grid">
                <div className="s3-field-group">
                  <label className="s3-field-label">1. {BUSINESS_MODEL_LABELS.customerSegments}</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: طلاب الجامعات محدودي الدخل..."
                    value={s3Blocks.customerSegments}
                    onChange={(e) =>
                      setS3Blocks((prev) => ({ ...prev, customerSegments: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="s3-field-group">
                  <label className="s3-field-label">2. {BUSINESS_MODEL_LABELS.valueProposition}</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: منصة رقمية لتبادل الكتب المستعملة..."
                    value={s3Blocks.valueProposition}
                    onChange={(e) =>
                      setS3Blocks((prev) => ({ ...prev, valueProposition: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="s3-field-group">
                  <label className="s3-field-label">3. {BUSINESS_MODEL_LABELS.channels}</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: تطبيق الجوال، مجموعات التيليجرام الجامعية..."
                    value={s3Blocks.channels}
                    onChange={(e) =>
                      setS3Blocks((prev) => ({ ...prev, channels: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="s3-field-group">
                  <label className="s3-field-label">4. {BUSINESS_MODEL_LABELS.revenueStreams}</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: عمولة 5% على كل عملية بيع ناجحة..."
                    value={s3Blocks.revenueStreams}
                    onChange={(e) =>
                      setS3Blocks((prev) => ({ ...prev, revenueStreams: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="s3-field-group s3-field-full">
                  <label className="s3-field-label">5. {BUSINESS_MODEL_LABELS.costStructure}</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: استضافة سحابية، بوابات الدفع الإلكتروني..."
                    value={s3Blocks.costStructure}
                    onChange={(e) =>
                      setS3Blocks((prev) => ({ ...prev, costStructure: e.target.value }))
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="s3-submit-actions">
                <button
                  type="button"
                  className="btn-mentor-action btn-s3-submit"
                  onClick={handleS3BlocksSubmit}
                  disabled={
                    isSubmitting ||
                    !s3Blocks.customerSegments.trim() ||
                    !s3Blocks.valueProposition.trim() ||
                    !s3Blocks.channels.trim() ||
                    !s3Blocks.revenueStreams.trim() ||
                    !s3Blocks.costStructure.trim()
                  }
                >
                  إرسال نموذج العمل للتدقيق
                </button>
              </div>
            </div>
          ) : s3Completed ? (
            <div className="composer-hint-banner">
              <span>اكتملت هذه المرحلة بنجاح. شكراً لك!</span>
            </div>
          ) : !isN1F && !isN2H ? (
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