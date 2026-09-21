"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  START_NODE_ID,
  getScenarioNode,
  SCENARIO_1_CANONICAL_OPENING,
  isSequentialJourneyVersion,
} from "@/lib/scenario";
import {
  MAX_STUDENT_ANSWER_LENGTH,
  ANSWER_TOO_LONG_ERROR,
} from "@/lib/validation";
import {
  ScenarioId,
  getJourneyProgress,
  getScenarioMeta,
  getNextScenarioId,
  getShortSkillTitle,
  getJourneyProgressPercent,
  formatElapsedActiveTime,
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
import {
  SCENARIO_4_CALM_OPENING,
  SCENARIO_4_CRISIS_ALERT,
  CRISIS_CHOICES,
  CRISIS_CHOICE_A,
  CRISIS_CHOICE_B,
  CRISIS_CHOICE_C,
  RECOVERY_PROMPT,
  RECOVERY_CHOICES,
  RECOVERY_CHOICE_A,
  RECOVERY_CHOICE_B,
  S4_END_TEXT,
  deserializeCrisisDecision,
  formatCrisisDecisionDisplay,
  deserializeRecoveryDecision,
  formatRecoveryDecisionDisplay,
} from "@/lib/scenarios/scenario-4";
import {
  SCENARIO_5_CANONICAL_OPENING,
  N2_DASHBOARD_PROMPT,
  CAMPAIGN_A_METRICS,
  CAMPAIGN_B_METRICS,
  REMAINING_BUDGET,
  S5_END_TEXT,
  deserializeHeadlines,
  formatHeadlinesDisplay,
  deserializeCampaignDecision,
  formatCampaignDecisionDisplay,
  type CampaignDecisionChoice,
} from "@/lib/scenarios/scenario-5";
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
  const [scenarioVersion, setScenarioVersion] = useState<string>("2.0");
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [currentScenario, setCurrentScenario] = useState<ScenarioId>(1);
  const [s2InitialIdea, setS2InitialIdea] = useState<string>("");
  const [s2DevelopedIdea, setS2DevelopedIdea] = useState<string>("");

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

  // S4 Crisis state
  const [crisisSecondsLeft, setCrisisSecondsLeft] = useState<number>(60);
  const [crisisTimerActive, setCrisisTimerActive] = useState<boolean>(false);

  // S5 Marketing states
  const [headlineA, setHeadlineA] = useState<string>("");
  const [headlineB, setHeadlineB] = useState<string>("");
  const [s5SelectedChoice, setS5SelectedChoice] = useState<CampaignDecisionChoice>("choose_b");
  const [s5Reasoning, setS5Reasoning] = useState<string>("");

  // Active visible UI timer (sessionStorage only, no DB interaction)
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!sessionId) return;
    const storageKey = `experiment_elapsed_active_seconds_${sessionId}`;
    try {
      const stored = sessionStorage.getItem(storageKey);
      const initial = stored ? parseInt(stored, 10) : 0;
      if (!isNaN(initial) && initial >= 0) {
        setActiveElapsedSeconds(initial);
      }
    } catch {
      // sessionStorage unavailable/sandboxed
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const storageKey = `experiment_elapsed_active_seconds_${sessionId}`;

    const interval = setInterval(() => {
      // Only increment when browser document is visible
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        setActiveElapsedSeconds((prev) => {
          const next = prev + 1;
          try {
            sessionStorage.setItem(storageKey, String(next));
          } catch {
            // ignore storage quota issues
          }
          return next;
        });
      }
    }, 1000);

    const handleVisibilityChange = () => {
      // Active state pauses when document becomes hidden, resumes when visible
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [sessionId]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);

  // Web Audio warning alert sound for Scenario 4 shock
  const playCrisisAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Gracefully ignore audio autoplay block
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);
  // Session restore & bootstrap
  useEffect(() => {
    const restoreSession = async () => {
      const storedSessionId = sessionStorage.getItem("experiment_session_id");

      if (!storedSessionId) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch("/api/session/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: storedSessionId }),
        });

        if (!res.ok) {
          sessionStorage.removeItem("experiment_session_id");
          router.replace("/");
          return;
        }

        const data = await res.json();

        // If completed experiment, route to complete page
        if (data.status === "completed") {
          router.replace("/complete");
          return;
        }

        setSessionId(storedSessionId);
        setCurrentNodeId(data.currentNode);
        const version = data.scenarioVersion || "2.0";
        setScenarioVersion(version);
        setStudentName(data.studentName || null);
        setStudentCode(data.studentCode || null);

        const scenarioNum: ScenarioId =
          typeof data.currentScenario === "number" &&
          data.currentScenario >= 1 &&
          data.currentScenario <= 5
            ? (data.currentScenario as ScenarioId)
            : 1;
        setCurrentScenario(scenarioNum);

        const activeNode = data.currentNode;
        const restoredMessages: ChatMessage[] = [];
        let msgIdCounter = 1;

        try {
          const startNodeS1 = getScenarioNode(START_NODE_ID, version);
          const initialTextS1 =
            isSequentialJourneyVersion(version) && startNodeS1.prompt
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
                  } else if (s === 4) {
                    restoredMessages.push({
                      id: `msg-${msgIdCounter++}`,
                      sender: "assistant",
                      text: SCENARIO_4_CALM_OPENING,
                    });
                  } else if (s === 5) {
                    restoredMessages.push({
                      id: `msg-${msgIdCounter++}`,
                      sender: "assistant",
                      text: SCENARIO_5_CANONICAL_OPENING,
                    });
                  }
                }
                trackedScenario = itemScenario;
              }

              if (item.studentAnswer === "CRISIS_START") {
                continue;
              }

              if (item.studentAnswer) {
                let studentDisplayText = item.studentAnswer;

                if (isStructuredBusinessModel(item.studentAnswer)) {
                  const parsedBlocks = deserializeBusinessModel(item.studentAnswer);
                  if (parsedBlocks) {
                    studentDisplayText = formatBusinessModelDisplay(parsedBlocks);
                    setS3Blocks(parsedBlocks);
                  }
                } else {
                  const parsedCrisis = deserializeCrisisDecision(item.studentAnswer);
                  if (parsedCrisis) {
                    studentDisplayText = formatCrisisDecisionDisplay(parsedCrisis);
                  } else {
                    const parsedRecovery = deserializeRecoveryDecision(item.studentAnswer);
                    if (parsedRecovery) {
                      studentDisplayText = formatRecoveryDecisionDisplay(parsedRecovery);
                    } else {
                      const parsedHeadlines = deserializeHeadlines(item.studentAnswer);
                      if (parsedHeadlines) {
                        studentDisplayText = formatHeadlinesDisplay(parsedHeadlines);
                        setHeadlineA(parsedHeadlines.headlineA);
                        setHeadlineB(parsedHeadlines.headlineB);
                      } else {
                        const parsedDecision = deserializeCampaignDecision(item.studentAnswer);
                        if (parsedDecision) {
                          studentDisplayText = formatCampaignDecisionDisplay(parsedDecision);
                        }
                      }
                    }
                  }
                }

                if (item.scenarioId === 2) {
                  if (item.nodeId === "N1") {
                    setS2InitialIdea(item.studentAnswer);
                  } else if (item.nodeId === "N4") {
                    setS2DevelopedIdea(item.studentAnswer);
                  }
                }

                restoredMessages.push({
                  id: `msg-${msgIdCounter++}`,
                  sender: "student",
                  text: studentDisplayText,
                });
              }

              if (item.feedback) {
                restoredMessages.push({
                  id: `msg-${msgIdCounter++}`,
                  sender: "assistant",
                  text: item.feedback,
                });
              }

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
              } else if (s === 4) {
                restoredMessages.push({
                  id: `msg-${msgIdCounter++}`,
                  sender: "assistant",
                  text: SCENARIO_4_CALM_OPENING,
                });
              } else if (s === 5) {
                restoredMessages.push({
                  id: `msg-${msgIdCounter++}`,
                  sender: "assistant",
                  text: SCENARIO_5_CANONICAL_OPENING,
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

          if (scenarioNum === 4 && activeNode === "N2") {
            if (data.crisisExpired) {
              setCrisisSecondsLeft(0);
              setCrisisTimerActive(false);
            } else if (typeof data.crisisRemainingSeconds === "number") {
              setCrisisSecondsLeft(data.crisisRemainingSeconds);
              setCrisisTimerActive(true);
            }
          }
        } catch (reconstructErr) {
          console.warn("Warning: Error reconstructing transcript history:", reconstructErr);
        }

        setMessages(restoredMessages);
        setIsRestoring(false);
      } catch (err) {
        console.error("Session restore failed:", err);
        router.replace("/");
      }
    };

    restoreSession();
  }, [router]);

  // Scenario 4 60-Second Countdown Timer Engine
  useEffect(() => {
    if (!crisisTimerActive || crisisSecondsLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCrisisSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCrisisTimerActive(false);
          handleCrisisDecision(null, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [crisisTimerActive, crisisSecondsLeft]);

  // S1 N2_H Auto-continue
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
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "تعذر المتابعة التلقائية");
        }

        const data = await res.json();
        const nextNode: string = data.nextNode;
        setCurrentNodeId(nextNode);

        if (nextNode === "END") {
          return;
        }

        const nextDef = getScenarioNode(nextNode as any, scenarioVersion);
        if (nextDef.prompt) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-prompt`,
              sender: "assistant",
              text: nextDef.prompt!,
            },
          ]);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "فشلت المتابعة التلقائية");
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

  const handleRequestHint = async () => {
    if (isSubmitting || isSubmittingRef.current || !sessionId) return;
    // S4 N2 timed crisis has NO hint
    if (currentScenario === 4 && currentNodeId === "N2") return;

    if (currentScenario === 3 && currentNodeId === "N1") {
      await handleSendMessage("ممكن تلميح يوضح كيف أبدأ في تعبئة كتل نموذج العمل؟", "💡 طلب تلميح");
      return;
    }

    if (currentScenario === 5 && currentNodeId === "N2") {
      await handleSendMessage("ممكن تلميح يساعدني في تحليل الأرقام وحساب تكلفة العميل؟", "💡 طلب تلميح");
      return;
    }

    await handleSendMessage("ممكن تلميح يساعدني في التفكير؟", "💡 طلب تلميح");
  };
  // Advance scenario handler
  const advanceScenario = async (fromScenario: ScenarioId) => {
    if (!sessionId) return;
    try {
      const advRes = await fetch("/api/session/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const advData = await advRes.json();
      const nextScenario: ScenarioId = advData.currentScenario;
      const nextNode: string = advData.currentNode;

      setCurrentScenario(nextScenario);
      setCurrentNodeId(nextNode);

      if (fromScenario === 1 && nextScenario === 2) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s2-start`,
            sender: "assistant",
            text: SCENARIO_2_CANONICAL_OPENING,
          },
        ]);
      } else if (fromScenario === 2 && nextScenario === 3) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s3-start`,
            sender: "assistant",
            text: SCENARIO_3_CANONICAL_OPENING,
          },
        ]);
      } else if (fromScenario === 3 && nextScenario === 4) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s4-start`,
            sender: "assistant",
            text: SCENARIO_4_CALM_OPENING,
          },
        ]);
      } else if (fromScenario === 4 && nextScenario === 5) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s5-start`,
            sender: "assistant",
            text: SCENARIO_5_CANONICAL_OPENING,
          },
        ]);
      }
    } catch (advErr) {
      console.error("Failed to advance scenario:", advErr);
    }
  };

  // Complete entire experiment (at S5 END)
  const handleOverallComplete = async () => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        router.replace("/complete");
      }
    } catch {
      setErrorMessage("تعذر إنهاء التجربة حالياً. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario 4: Start Crisis Shock
  const handleStartCrisisShock = async () => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    playCrisisAlertSound();

    try {
      const res = await fetch("/api/s4/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        throw new Error("فشل بدء محاكاة الأزمة");
      }
      const data = await res.json();
      setCurrentNodeId("N2");
      setCrisisSecondsLeft(data.remainingSeconds);
      setCrisisTimerActive(!data.expired);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-crisis-alert`,
          sender: "assistant",
          text: SCENARIO_4_CRISIS_ALERT,
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء بدء الأزمة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario 4: Submit Crisis Decision (or Timeout)
  const handleCrisisDecision = async (choice: "A" | "B" | "C" | null, timeout: boolean = false) => {
    if (!sessionId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setCrisisTimerActive(false);
    setErrorMessage(null);

    const displayMsg = formatCrisisDecisionDisplay({ choice, timeout });
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student-crisis`,
        sender: "student",
        text: displayMsg,
      },
    ]);

    try {
      const res = await fetch("/api/s4/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, choice, timeout }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل تسجيل قرار الأزمة");
      }

      const data = await res.json();
      const nextNode = data.nextNode;
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
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر تسجيل قرار الأزمة. يرجى المحاولة ثانية.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Scenario 4: Continue from Consequence (N3) to Recovery (N4)
  const handleContinueToRecovery = async () => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/s4/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "continue_to_recovery" }),
      });
      if (!res.ok) throw new Error("فشل الانتقال لمرحلة التعافي");
      const data = await res.json();
      setCurrentNodeId("N4");
      if (data.prompt) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-recovery-prompt`,
            sender: "assistant",
            text: data.prompt,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر الانتقال لمرحلة التعافي.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario 4: Submit Recovery Decision
  const handleRecoveryDecision = async (choice: "A" | "B") => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const displayMsg = formatRecoveryDecisionDisplay({ choice });
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student-recovery`,
        sender: "student",
        text: displayMsg,
      },
    ]);

    try {
      const res = await fetch("/api/s4/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, recoveryChoice: choice }),
      });

      if (!res.ok) throw new Error("فشل تسجيل قرار التعافي");
      const data = await res.json();
      setCurrentNodeId("END");

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-recovery-feedback`,
            sender: "assistant",
            text: data.feedback,
          },
          {
            id: `msg-${Date.now()}-s4-end`,
            sender: "assistant",
            text: S4_END_TEXT,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر تسجيل قرار التعافي.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // Scenario 5: Submit Two Headlines
  const handleHeadlinesSubmit = async () => {
    if (!headlineA.trim() || !headlineB.trim() || !sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const displayCard = formatHeadlinesDisplay({ headlineA, headlineB });
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-headlines`,
        sender: "student",
        text: displayCard,
      },
    ]);

    try {
      const res = await fetch("/api/s5/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          headlineA,
          headlineB,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "فشل إطلاق حملة الـ A/B Testing");
      }

      const data = await res.json();
      setCurrentNodeId("N2");

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-dashboard`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إطلاق الحملة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario 5: Submit Campaign Decision
  const handleCampaignDecisionSubmit = async () => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const displayMsg = formatCampaignDecisionDisplay({
      selectedChoice: s5SelectedChoice,
      reasoning: s5Reasoning,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student-decision`,
        sender: "student",
        text: displayMsg,
      },
    ]);

    try {
      const res = await fetch("/api/s5/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          selectedChoice: s5SelectedChoice,
          reasoning: s5Reasoning,
        }),
      });

      if (!res.ok) throw new Error("فشل إرسال القرار التسويقي");
      const data = await res.json();
      const nextNode = data.nextNode;
      setCurrentNodeId(nextNode);

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-decision-feedback`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر إرسال القرار التسويقي.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario 5: Continue / Change Decision to N4 Budget
  const handleContinueToBudget = async (confirmedChange: boolean = false) => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const action = confirmedChange ? "confirm_change_decision" : "continue_to_budget";
    if (confirmedChange) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-change-confirm`,
          sender: "student",
          text: "نعم، أغير قراري وأختار الحملة (B) لتركيز الميزانية عليها بناءً على تكلفة العميل.",
        },
      ]);
    }

    try {
      const res = await fetch("/api/s5/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      if (!res.ok) throw new Error("فشل المتابعة لتوجيه الميزانية");
      const data = await res.json();
      setCurrentNodeId("N4");
      if (data.prompt) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-budget-prompt`,
            sender: "assistant",
            text: data.prompt,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر المتابعة لتوجيه الميزانية.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scenario 5: Finalize from N4 to END
  const handleFinalizeScenario5 = async () => {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-budget-alloc`,
        sender: "student",
        text: "توجيه باقي الميزانية (800 دولار) للحملة (B) لتحقيق أقصى عائد مالي (ROI)",
      },
    ]);

    try {
      const res = await fetch("/api/s5/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "continue_to_budget" }),
      });
      if (!res.ok) throw new Error("فشل إتمام السيناريو الخامس");
      const data = await res.json();
      setCurrentNodeId("END");

      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-s5-end`,
            sender: "assistant",
            text: data.feedback,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "تعذر إتمام السيناريو الخامس.");
    } finally {
      setIsSubmitting(false);
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

      if (nextNode === "END") {
        return;
      }

      const nextDef = getScenarioNode(nextNode as any, scenarioVersion);
      const promptText = nextDef.prompt || nextDef.message;
      if (promptText) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-prompt`,
            sender: "assistant",
            text: promptText,
          },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء إرسال الخيار. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };
  // Conversational message sender (S1 / S2 / S3 conversational nodes)
  const handleSendMessage = async (textOverride?: string, displayOverride?: string) => {
    const textToSend = typeof textOverride === "string" ? textOverride : studentAnswer;
    const trimmed = textToSend.trim();
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
        text: displayOverride || trimmed,
      },
    ]);
    if (!textOverride) {
      setStudentAnswer("");
    }

    if (currentScenario === 2) {
      if (currentNodeId === "N1") {
        setS2InitialIdea(trimmed);
      } else if (currentNodeId === "N4") {
        setS2DevelopedIdea(trimmed);
      }
    }

    try {
      let endpoint = "/api/chat";
      if (currentScenario === 1) {
        endpoint =
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
            : "/api/chat";
      } else if (currentScenario === 2) {
        endpoint = "/api/s2/submit";
      } else if (currentScenario === 3) {
        endpoint = "/api/s3/submit";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer: trimmed }),
      });

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
              id: `msg-${Date.now()}-prompt`,
              sender: "assistant",
              text: nextPrompt,
            },
          ]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء معالجة الإجابة. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Submit handler for S3 5-block model
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
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const displayCard = formatBusinessModelDisplay(s3Blocks);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-student`,
        sender: "student",
        text: displayCard,
      },
    ]);
    setS3Blocks(s3Blocks);

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

  // Submit handler for S3 support query
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
  const isS3Structured = currentScenario === 3 && currentNodeId === "N1";

  // Scenario 4 state checks
  const isS4 = currentScenario === 4;
  const isS4N1 = isS4 && currentNodeId === "N1";
  const isS4CrisisActive = isS4 && currentNodeId === "N2";
  const isS4Consequence = isS4 && (currentNodeId === "N3_A" || currentNodeId === "N3_B" || currentNodeId === "N3_C");
  const isS4Recovery = isS4 && currentNodeId === "N4";
  const isS4End = isS4 && currentNodeId === "END";

  // Scenario 5 state checks
  const isS5 = currentScenario === 5;
  const isS5N1 = isS5 && currentNodeId === "N1";
  const isS5N2 = isS5 && currentNodeId === "N2";
  const isS5N3 = isS5 && (currentNodeId === "N3_A" || currentNodeId === "N3_B" || currentNodeId === "N3_C");
  const isS5N4 = isS5 && currentNodeId === "N4";
  const isS5End = isS5 && currentNodeId === "END";

  const journeyProgress = getJourneyProgress(currentScenario);
  const activeSkillMeta = getScenarioMeta(currentScenario);
  const nextScenarioId = getNextScenarioId(currentScenario);
  const nextSkillMeta = nextScenarioId ? getScenarioMeta(nextScenarioId) : null;

  const currentTaskText =
    currentNodeId !== "END"
      ? (activeNodeDef?.prompt || ("message" in (activeNodeDef || {}) ? (activeNodeDef as any).message : ""))
      : "";

  const isHintAvailable =
    !isSubmitting &&
    currentNodeId !== "END" &&
    !isN1F &&
    !isN2H &&
    !isS4CrisisActive &&
    !isS4Recovery &&
    !isS4Consequence &&
    !isS5N3 &&
    !isS5N4;

  const progressPercentage = getJourneyProgressPercent(currentScenario, isS5End);

  const hasCompletedS3Model =
    Boolean(s3Blocks.customerSegments?.trim()) &&
    Boolean(s3Blocks.valueProposition?.trim()) &&
    Boolean(s3Blocks.channels?.trim()) &&
    Boolean(s3Blocks.revenueStreams?.trim()) &&
    Boolean(s3Blocks.costStructure?.trim());

  const s1StudentAnswers = messages.filter(
    (m) => m.sender === "student" && currentScenario === 1
  );
  const s1LatestAnswer = s1StudentAnswers.length > 0 ? s1StudentAnswers[s1StudentAnswers.length - 1].text : null;
  return (
    <div className={`mentor-chat-viewport ${isS4CrisisActive ? "crisis-mode-active" : ""}`} dir="rtl">
      {/* 1. Compact Restrained Header */}
      <header className="mentor-chat-header">
        <div className="mentor-chat-header-content">
          <div className="mentor-brand">
            <div className="mentor-avatar-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.1 5 7.4V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.6c3-1.3 5-4.1 5-7.4a8 8 0 0 0-8-8z" />
                <path d="M10 14h4" />
              </svg>
            </div>
            <h1 className="mentor-title">المرشد الريادي الذكي</h1>
          </div>

          {studentName && (
            <div className="mentor-chat-header-user">
              <span className="mentor-user-greeting">أهلًا، {studentName}</span>
              {studentCode && (
                <span className="mentor-user-code">{studentCode}</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Journey Summary (<768px) */}
      <div className="journey-mobile-summary" aria-label="ملخص مسار المرحلة">
        <div className="journey-mobile-header">
          <div>
            <span className="journey-mobile-badge">المرحلة {currentScenario} من 5 · </span>
            <span className="journey-mobile-title">{activeSkillMeta?.skillTitle || "اكتشاف الفرص الرقمية"}</span>
          </div>
          <span className="journey-mobile-timer">⏱ {formatElapsedActiveTime(activeElapsedSeconds)}</span>
        </div>
        <div className="journey-mobile-progress-row">
          <div
            className="journey-progress-bar-track"
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="التقدم في مسار المهارات"
          >
            <div className="journey-progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
          </div>
          <span className="journey-mobile-percent">{progressPercentage}%</span>
        </div>
      </div>

      {/* Two-Column Desktop/Tablet Workspace Container */}
      <div className="mentor-workspace-container">
        <div className="mentor-workspace-layout">
          {/* Slim Vertical Side Rail (240–280px) */}
          <aside className="journey-rail" aria-label="مسار الرحلة التعليمية">
            <div className="journey-rail-card">
              <div className="journey-rail-stage-badge">المرحلة {currentScenario} من 5</div>
              <div className="journey-rail-stage-title">
                {activeSkillMeta?.skillTitle || "اكتشاف الفرص الرقمية"}
              </div>

              <div className="journey-rail-progress-section">
                <div className="journey-rail-progress-header">
                  <span className="journey-rail-progress-label">التقدم في الرحلة</span>
                  <span className="journey-rail-progress-value">{progressPercentage}%</span>
                </div>
                <div
                  className="journey-progress-bar-track"
                  role="progressbar"
                  aria-valuenow={progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="التقدم في الرحلة"
                >
                  <div
                    className="journey-progress-bar-fill"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <nav className="journey-stepper-vertical" aria-label="خطوات المهارات الخمس">
                {journeyProgress.map((item) => {
                  const isCurrent = item.state === "active";
                  const isCompleted = item.state === "completed";
                  const icon = isCompleted ? "✓" : isCurrent ? "●" : "○";
                  const stateLabel = isCompleted ? "مكتملة" : isCurrent ? "حالية" : "قادمة";
                  const stepperTitles: Record<number, string> = {
                    1: "اكتشاف الفرص",
                    2: "توليد الأفكار",
                    3: "نموذج العمل",
                    4: "المخاطر",
                    5: "التسويق",
                  };
                  const stepperTitle = stepperTitles[item.id] || item.shortTitle;

                  return (
                    <div
                      key={item.id}
                      className={`journey-step-item ${isCurrent ? "journey-step-active" : isCompleted ? "journey-step-completed" : "journey-step-upcoming"}`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span className="journey-step-icon" aria-hidden="true">{icon}</span>
                      <span className="journey-step-title">{stepperTitle}</span>
                      <span className="sr-only">({stateLabel})</span>
                    </div>
                  );
                })}
              </nav>

              <div className="journey-rail-timer-section">
                <div className="journey-rail-timer-label">الوقت المنقضي</div>
                <div
                  className="journey-rail-timer-value"
                  aria-label={`الوقت المنقضي: ${formatElapsedActiveTime(activeElapsedSeconds)}`}
                >
                  {formatElapsedActiveTime(activeElapsedSeconds)}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Workspace Column (72–76%) */}
          <div className="mentor-workspace-main">
            <main className="mentor-chat-main" aria-label="محادثة الإرشاد الذكي">
        <div className="mentor-stream-container">
          {/* S1: Deterministic Thinking Panel Inline when answers exist */}
          {currentScenario === 1 && currentNodeId !== "END" && s1LatestAnswer && (
            <div className="s1-thinking-panel" role="region" aria-label="ما سجلته حتى الآن">
              <div className="s1-thinking-title">
                <span>💡</span>
                <span>ما سجلته حتى الآن:</span>
              </div>
              <div className="s1-thinking-content">
                {s1LatestAnswer}
              </div>
            </div>
          )}

          {/* S2: Idea Evolution Panel Inline when answers exist */}
          {currentScenario === 2 && currentNodeId !== "END" && (s2InitialIdea || s2DevelopedIdea) && (
            <div className="s2-idea-evolution" role="region" aria-label="تطور الفكرة">
              {s2InitialIdea && (
                <div className="s2-idea-card">
                  <div className="s2-idea-card-header">🌱 الفكرة الأولى:</div>
                  <div className="s2-idea-card-body">{s2InitialIdea}</div>
                </div>
              )}
              {s2DevelopedIdea && (
                <div className="s2-idea-card">
                  <div className="s2-idea-card-header">🚀 الفكرة بعد التطوير:</div>
                  <div className="s2-idea-card-body">{s2DevelopedIdea}</div>
                </div>
              )}
            </div>
          )}

          {/* S3: Persistent Read-Only Model Summary Inline */}
          {currentScenario === 3 && currentNodeId !== "N1" && currentNodeId !== "END" && hasCompletedS3Model && (
            <div className="s3-model-summary" role="region" aria-label="نموذجك الحالي">
              <div className="s3-summary-header">
                <span>📋</span>
                <span>نموذجك الحالي:</span>
              </div>
              <div className="s3-summary-grid">
                <div className="s3-summary-item">
                  <span className="s3-summary-label">1. شرائح العملاء</span>
                  <span className="s3-summary-val">{s3Blocks.customerSegments}</span>
                </div>
                <div className="s3-summary-item">
                  <span className="s3-summary-label">2. عرض القيمة</span>
                  <span className="s3-summary-val">{s3Blocks.valueProposition}</span>
                </div>
                <div className="s3-summary-item">
                  <span className="s3-summary-label">3. القنوات</span>
                  <span className="s3-summary-val">{s3Blocks.channels}</span>
                </div>
                <div className="s3-summary-item">
                  <span className="s3-summary-label">4. مصادر الإيرادات</span>
                  <span className="s3-summary-val">{s3Blocks.revenueStreams}</span>
                </div>
                <div className="s3-summary-item">
                  <span className="s3-summary-label">5. هيكل التكاليف</span>
                  <span className="s3-summary-val">{s3Blocks.costStructure}</span>
                </div>
              </div>
            </div>
          )}

          {/* Messages Stream */}
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
                <div className={`chat-message-role-label role-label-${msg.sender}`}>
                  {msg.sender === "student" ? "إجابتك" : "المساعد"}
                </div>
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
                <span className="thinking-label">المرشد يُفكر...</span>
              </div>
            </div>
          )}

          {/* S1 N1_F Quick Reply Choices */}
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

          {/* S1 N2_H Auto-continue retry */}
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

          {/* Standardized Scenario Completion Transition (S1, S2, S3, S4) */}
          {currentNodeId === "END" && currentScenario < 5 && (
            <div className="scenario-transition-card" role="status" aria-label="اكتمال المهارة">
              <div className="transition-completed-line">
                <span>✓</span>
                <span>أكملت مهارة: {activeSkillMeta?.skillTitle}</span>
              </div>
              <div className="transition-next-line">
                <span>التالي: </span>
                <strong>{nextSkillMeta?.skillTitle}</strong>
              </div>
              <button
                type="button"
                className="btn-transition-advance"
                onClick={() => advanceScenario(currentScenario)}
                disabled={isSubmitting}
              >
                متابعة ←
              </button>
            </div>
          )}

          {/* S5 Completion -> Final Experiment Completion Card */}
          {isS5End && (
            <div className="scenario-transition-card" role="status" aria-label="اكتمال مسار التجربة">
              <div className="transition-completed-line">
                <span>🎉</span>
                <span>تهانينا! لقد أتممت جميع المهارات الريادية الخمس بنجاح.</span>
              </div>
              <div className="transition-next-line">
                <span>شكراً لجهودك ومشاركتك القيّمة. اضغط أدناه لحفظ إنجازك والانتقال إلى الصفحة الختامية.</span>
              </div>
              <button
                type="button"
                className="btn-transition-advance"
                onClick={handleOverallComplete}
                disabled={isSubmitting}
              >
                إنهاء التجربة بالكامل وحفظ الإنجاز ←
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 4. Compact Sticky Composer & Specialized Interventions */}
      <footer className="mentor-chat-composer-bar">
        <div className="composer-inner">
          {errorMessage && (
            <div className="composer-error-banner" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* S3: Gap Review Card (Cross-field review) */}
          {currentScenario === 3 && currentNodeId.includes("GAP") && (
            <div className="s3-review-card" role="region" aria-label="مراجعة الترابط">
              <div className="s3-review-header">⚠️ راجع الترابط</div>
              <div className="s3-review-body">
                يرجى مراجعة التوافق المنطقي بين مكونات نموذج العمل كما بيّن المرشد في الملاحظات السابقة.
              </div>
            </div>
          )}

          {/* Compact Current Task Presentation ("مهمتك الآن") */}
          {currentTaskText && currentNodeId !== "END" && (
            <div
              className="current-task-compact"
              role="region"
              aria-label="مهمتك الآن"
            >
              <div className="current-task-compact-header">
                <span className="current-task-badge">📌 مهمتك الآن:</span>
                {currentScenario === 2 && (currentNodeId === "N2" || currentNodeId === "N3") && (
                  <span className="current-task-challenge-tag">
                    {currentNodeId === "N2" ? "تحدي الميزانية" : "تحدي المنافسة"}
                  </span>
                )}
              </div>
              <div className="current-task-compact-text">
                {currentTaskText}
              </div>
            </div>
          )}

          {/* Specialized Scenario Interactions */}
          {isS4N1 ? (
            /* S4 N1: Calm Phase -> Trigger Crisis Shock */
            <div className="s5-decision-composer">
              <p style={{ margin: 0, fontWeight: 600, color: "#1e293b" }}>
                مشروعك يعمل باستقرار حالياً.. اضغط أدناه للمتابعة ورؤية ما سيحدث في يوم العمل التالي:
              </p>
              <button
                type="button"
                className="btn-transition-advance"
                style={{ alignSelf: "stretch", textAlign: "center" }}
                onClick={handleStartCrisisShock}
                disabled={isSubmitting}
              >
                متابعة سير العمل في المشروع ←
              </button>
            </div>
          ) : isS4CrisisActive ? (
            /* S4 N2: 60-Second Timed Crisis Intervention (NO HINT BUTTON HERE) */
            <div className="crisis-alert-banner" role="region" aria-label="محاكاة الأزمة">
              <div className="crisis-alert-header">
                <span>🚨 هجوم سيبراني قيد التنفيذ! اختر قرارك قبل انتهاء الوقت:</span>
                <div className="crisis-timer-badge">
                  ⏱️ 00:{String(crisisSecondsLeft).padStart(2, "0")}
                </div>
              </div>
              <div className="crisis-timer-progress">
                <div
                  className="crisis-timer-fill"
                  style={{ width: `${(crisisSecondsLeft / 60) * 100}%` }}
                />
              </div>
              <div className="crisis-options-container">
                <button
                  type="button"
                  className="crisis-option-card"
                  onClick={() => handleCrisisDecision("A")}
                  disabled={isSubmitting || crisisSecondsLeft <= 0}
                >
                  <strong>الخيار (أ):</strong> {CRISIS_CHOICE_A}
                </button>
                <button
                  type="button"
                  className="crisis-option-card"
                  onClick={() => handleCrisisDecision("B")}
                  disabled={isSubmitting || crisisSecondsLeft <= 0}
                >
                  <strong>الخيار (ب):</strong> {CRISIS_CHOICE_B}
                </button>
                <button
                  type="button"
                  className="crisis-option-card"
                  onClick={() => handleCrisisDecision("C")}
                  disabled={isSubmitting || crisisSecondsLeft <= 0}
                >
                  <strong>الخيار (ج):</strong> {CRISIS_CHOICE_C}
                </button>
              </div>
            </div>
          ) : isS4Consequence ? (
            /* S4 N3: Consequence -> Continue to Recovery */
            <div className="s4-consequence-card" role="region" aria-label="تداعيات القرار">
              <div className="s4-consequence-header">تداعيات القرار المتخذ:</div>
              <p className="s4-consequence-body">
                {activeNodeDef?.message || "تم تسجيل قرارك وملاحظة تبعاته التشغيلية."}
              </p>
              <button
                type="button"
                className="btn-transition-advance"
                style={{ alignSelf: "stretch", textAlign: "center", marginTop: "0.75rem" }}
                onClick={handleContinueToRecovery}
                disabled={isSubmitting}
              >
                الانتقال لمرحلة التعافي وإدارة السمعة ←
              </button>
            </div>
          ) : isS4Recovery ? (
            /* S4 N4: Recovery Choices */
            <div className="recovery-options-container" role="region" aria-label="خيارات التعافي">
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: 700, color: "var(--text-primary)" }}>
                ما هي استراتيجيتك للتعافي وامتصاص غضب العملاء؟
              </p>
              <button
                type="button"
                className="recovery-option-card"
                onClick={() => handleRecoveryDecision("A")}
                disabled={isSubmitting}
              >
                <strong>(أ)</strong> {RECOVERY_CHOICE_A}
              </button>
              <button
                type="button"
                className="recovery-option-card"
                onClick={() => handleRecoveryDecision("B")}
                disabled={isSubmitting}
              >
                <strong>(ب)</strong> {RECOVERY_CHOICE_B}
              </button>
            </div>
          ) : isS5N1 ? (
            /* S5 N1: Two Headlines Input Composer */
            <div className="s5-headlines-composer" role="region" aria-label="إعداد تجربة A/B">
              <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                إعداد عنواني الحملتين الإعلانيتين (A/B Test)
              </h2>
              <div className="s3-blocks-grid">
                <div className="s3-field-group">
                  <label className="s3-field-label">عنوان الحملة (A) - التركيز على السعر والخصم:</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: خصم 50% لأول 100 مشترك اليوم فقط!"
                    value={headlineA}
                    onChange={(e) => setHeadlineA(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="s3-field-group">
                  <label className="s3-field-label">عنوان الحملة (B) - التركيز على الجودة والخدمة:</label>
                  <input
                    type="text"
                    className="s3-field-input"
                    placeholder="مثال: الخدمة الأكثر موثوقية وجودة لطلاب الجامعات مع دعم فوري!"
                    value={headlineB}
                    onChange={(e) => setHeadlineB(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="s3-submit-actions">
                <button
                  type="button"
                  className="btn-mentor-action btn-s3-submit"
                  onClick={handleHeadlinesSubmit}
                  disabled={isSubmitting || !headlineA.trim() || !headlineB.trim()}
                >
                  إطلاق اختبار A/B ورؤية النتائج ←
                </button>
              </div>
            </div>
          ) : isS5N2 ? (
            /* S5 N2: Results Dashboard & Decision */
            <div className="s5-decision-composer" role="region" aria-label="لوحة نتائج A/B">
              {/* Canonical Experiment Setup Summary */}
              <div className="s5-budget-setup-strip">
                <span>الميزانية الكلية: 1000$</span>
                <span>اختبار الحملة (A): 100$</span>
                <span>اختبار الحملة (B): 100$</span>
                <span>الميزانية المتبقية للاستثمار: {REMAINING_BUDGET}$</span>
              </div>

              <div className="s5-dashboard-card">
                <div className="s5-dashboard-title">
                  <span>📊</span>
                  <span>نتائج اختبار A/B بعد إنفاق 100$ على كل حملة:</span>
                </div>

                <div className="s5-campaigns-grid">
                  <div className="s5-campaign-box">
                    <div className="s5-campaign-header">
                      <span className="s5-campaign-badge s5-badge-a">الحملة (A) - الخصم</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>إنفاق: 100$</span>
                    </div>
                    <div className="s5-metric-row">
                      <span>الزيارات (النقرات):</span>
                      <span className="s5-metric-val">{CAMPAIGN_A_METRICS.visits}</span>
                    </div>
                    <div className="s5-metric-bar-track">
                      <div className="s5-metric-bar-fill-a" style={{ width: "100%" }} />
                    </div>
                    <div className="s5-metric-row" style={{ marginTop: "0.25rem" }}>
                      <span>العملاء الفعليون:</span>
                      <span className="s5-metric-val">{CAMPAIGN_A_METRICS.buyers} عملاء</span>
                    </div>
                    <div className="s5-metric-bar-track">
                      <div className="s5-metric-bar-fill-a" style={{ width: "25%" }} />
                    </div>
                    <div className="s5-metric-row" style={{ marginTop: "0.25rem" }}>
                      <span>تكلفة اكتساب العميل (CPA):</span>
                      <span className="s5-metric-val">{CAMPAIGN_A_METRICS.cpa}$</span>
                    </div>
                  </div>

                  <div className="s5-campaign-box">
                    <div className="s5-campaign-header">
                      <span className="s5-campaign-badge s5-badge-b">الحملة (B) - الجودة</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>إنفاق: 100$</span>
                    </div>
                    <div className="s5-metric-row">
                      <span>الزيارات (النقرات):</span>
                      <span className="s5-metric-val">{CAMPAIGN_B_METRICS.visits}</span>
                    </div>
                    <div className="s5-metric-bar-track">
                      <div className="s5-metric-bar-fill-b" style={{ width: "20%" }} />
                    </div>
                    <div className="s5-metric-row" style={{ marginTop: "0.25rem" }}>
                      <span>العملاء الفعليون:</span>
                      <span className="s5-metric-val">{CAMPAIGN_B_METRICS.buyers} عميلاً</span>
                    </div>
                    <div className="s5-metric-bar-track">
                      <div className="s5-metric-bar-fill-b" style={{ width: "100%" }} />
                    </div>
                    <div className="s5-metric-row" style={{ marginTop: "0.25rem" }}>
                      <span>تكلفة اكتساب العميل (CPA):</span>
                      <span className="s5-metric-val">{CAMPAIGN_B_METRICS.cpa}$</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision Selection & Reasoning */}
              <div className="s5-choices-group">
                <label
                  className={`s5-choice-radio-card ${s5SelectedChoice === "choose_b" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="s5Decision"
                    value="choose_b"
                    checked={s5SelectedChoice === "choose_b"}
                    onChange={() => setS5SelectedChoice("choose_b")}
                  />
                  <span>🟢 إيقاف الحملة (A) وتوجيه باقي الميزانية (800$) للحملة (B) [التركيز على المشترين الفعليين]</span>
                </label>

                <label
                  className={`s5-choice-radio-card ${s5SelectedChoice === "choose_a" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="s5Decision"
                    value="choose_a"
                    checked={s5SelectedChoice === "choose_a"}
                    onChange={() => setS5SelectedChoice("choose_a")}
                  />
                  <span>🔴 إيقاف الحملة (B) والاستمرار في الحملة (A) [لأنها جلبت 1000 زيارة]</span>
                </label>

                <label
                  className={`s5-choice-radio-card ${s5SelectedChoice === "unable" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="s5Decision"
                    value="unable"
                    checked={s5SelectedChoice === "unable"}
                    onChange={() => setS5SelectedChoice("unable")}
                  />
                  <span>⚪ أحتاج مساعدة في تحليل الأرقام والربط بين النقرات والمبيعات</span>
                </label>
              </div>

              <textarea
                className="mentor-composer-textarea"
                rows={2}
                placeholder="اشرح تبريرك للقرار (لماذا اخترت ذلك بناءً على الأرقام؟)..."
                value={s5Reasoning}
                onChange={(e) => setS5Reasoning(e.target.value)}
                disabled={isSubmitting}
              />

              <div className="composer-row" style={{ marginTop: "0.5rem" }}>
                {isHintAvailable && (
                  <button
                    type="button"
                    className="btn-hint"
                    onClick={handleRequestHint}
                    disabled={isSubmitting}
                    aria-label="طلب تلميح"
                    title="طلب تلميح تحليلي لحساب تكلفة العميل"
                  >
                    <span aria-hidden="true">💡</span>
                    <span>تلميح</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-mentor-send"
                  style={{ flex: 1 }}
                  onClick={handleCampaignDecisionSubmit}
                  disabled={isSubmitting}
                >
                  إرسال القرار والتحليل ←
                </button>
              </div>
            </div>
          ) : isS5N3 ? (
            /* S5 N3: Branch Handling (Correction or Confirmation) */
            <div className="s5-decision-composer">
              {currentNodeId === "N3_A" ? (
                <div>
                  <div className="s5-correction-card" role="alert">
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      لقد بين المرشد أن تكلفة اكتساب العميل في الحملة (A) هي 20$ بينما في (B) هي 5$ فقط. هل تريد تغيير قرارك؟
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-transition-advance"
                    style={{ alignSelf: "stretch", textAlign: "center", marginTop: "0.75rem" }}
                    onClick={() => handleContinueToBudget(true)}
                    disabled={isSubmitting}
                  >
                    نعم، أغير قراري وأختار الحملة (B) لتركيز الميزانية عليها ←
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-transition-advance"
                  style={{ alignSelf: "stretch", textAlign: "center" }}
                  onClick={() => handleContinueToBudget(false)}
                  disabled={isSubmitting}
                >
                  متابعة إلى مرحلة تخصيص الميزانية المتبقية ({REMAINING_BUDGET}$) ←
                </button>
              )}
            </div>
          ) : isS5N4 ? (
            /* S5 N4: Allocate Remaining Budget to B */
            <div className="s5-decision-composer">
              <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600, color: "var(--accent-forest)" }}>
                جاهز لتوجيه باقي الميزانية (800 دولار) للحملة (B) لتعظيم العائد المالي (ROI)؟
              </p>
              <button
                type="button"
                className="btn-transition-advance"
                style={{ alignSelf: "stretch", textAlign: "center" }}
                onClick={handleFinalizeScenario5}
                disabled={isSubmitting}
              >
                تأكيد توجيه 800$ للحملة (B) والاطلاع على التقرير الختامي ←
              </button>
            </div>
          ) : isS3Structured ? (
            /* S3 N1 Structured 5-Block Input */
            <div className="s3-structured-composer">
              <div className="s3-composer-header">
                <h2 className="s3-composer-title">تعبئة لوحة نموذج العمل التجاري</h2>
              </div>

              <div className="s3-blocks-grid">
                <div className="s3-field-group">
                  <label className="s3-field-label">
                    1. {BUSINESS_MODEL_LABELS.customerSegments}{" "}
                    {s3Blocks.customerSegments.trim() && <span style={{ color: "var(--accent-forest)" }}>✓</span>}
                  </label>
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
                  <label className="s3-field-label">
                    2. {BUSINESS_MODEL_LABELS.valueProposition}{" "}
                    {s3Blocks.valueProposition.trim() && <span style={{ color: "var(--accent-forest)" }}>✓</span>}
                  </label>
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
                  <label className="s3-field-label">
                    3. {BUSINESS_MODEL_LABELS.channels}{" "}
                    {s3Blocks.channels.trim() && <span style={{ color: "var(--accent-forest)" }}>✓</span>}
                  </label>
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
                  <label className="s3-field-label">
                    4. {BUSINESS_MODEL_LABELS.revenueStreams}{" "}
                    {s3Blocks.revenueStreams.trim() && <span style={{ color: "var(--accent-forest)" }}>✓</span>}
                  </label>
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
                  <label className="s3-field-label">
                    5. {BUSINESS_MODEL_LABELS.costStructure}{" "}
                    {s3Blocks.costStructure.trim() && <span style={{ color: "var(--accent-forest)" }}>✓</span>}
                  </label>
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

              <div className="composer-row" style={{ marginTop: "0.5rem" }}>
                {isHintAvailable && (
                  <button
                    type="button"
                    className="btn-hint"
                    onClick={handleRequestHint}
                    disabled={isSubmitting}
                    aria-label="طلب تلميح"
                    title="طلب تلميح لتوضيح كيفية ملء كتل النموذج"
                  >
                    <span aria-hidden="true">💡</span>
                    <span>تلميح</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-mentor-send"
                  style={{ flex: 1 }}
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
                  إرسال نموذج العمل للتدقيق ←
                </button>
              </div>
            </div>
          ) : !isN1F && !isN2H && currentNodeId !== "END" && (
            /* Standard Clean Single-Line Composer with Single Hint Button */
            <div className="composer-container-group">
              <div className="composer-row">
                {isHintAvailable && (
                  <button
                    type="button"
                    id="hint-button"
                    className="btn-hint"
                    onClick={handleRequestHint}
                    disabled={isSubmitting}
                    aria-label="طلب تلميح"
                    title="طلب تلميح لمساعدتك في التفكير"
                  >
                    <span aria-hidden="true">💡</span>
                    <span>تلميح</span>
                  </button>
                )}

                <div className="composer-input-wrapper">
                  <textarea
                    ref={textareaRef}
                    id="mentor-answer-input"
                    className="mentor-composer-textarea"
                    placeholder="اكتب إجابتك هنا..."
                    rows={1}
                    value={studentAnswer}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    maxLength={MAX_STUDENT_ANSWER_LENGTH}
                    aria-label="إجابتك للمرشد الذكي"
                  />

                  <span className="char-counter" aria-live="polite">
                    {studentAnswer.length}/{MAX_STUDENT_ANSWER_LENGTH}
                  </span>
                </div>

                <button
                  type="button"
                  id="send-message-button"
                  className="btn-mentor-send"
                  onClick={() => handleSendMessage()}
                  disabled={isSubmitting || !studentAnswer.trim()}
                  aria-label="إرسال الإجابة"
                >
                  <span>إرسال</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ transform: "rotate(180deg)" }}>
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>

              <div className="composer-helper-note" aria-hidden="true">
                Enter للإرسال · Shift+Enter لسطر جديد
              </div>
            </div>
          )}
        </div>
      </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
