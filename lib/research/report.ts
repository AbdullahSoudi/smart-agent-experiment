import type { SessionRecord, InteractionRecord } from "@/lib/server/persistence";
import { deserializeBusinessModel, type BusinessModelBlocks } from "@/lib/scenarios/scenario-3";
import { deserializeCrisisDecision, deserializeRecoveryDecision } from "@/lib/scenarios/scenario-4";
import { deserializeHeadlines, deserializeCampaignDecision } from "@/lib/scenarios/scenario-5";

export interface ParticipantSummary {
  sessionId: string;
  studentName: string;
  studentCode: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  durationFormatted: string;
  durationLabel: string;
  lastActivityAt: string | null;
  lastActivityRelative: string;
  freshnessLabel: string;
  currentScenario: number;
  currentNode: string;
  completedSkillsCount: number;
  totalInteractions: number;
  evaluatedCount: number;
  supportCount: number;
  offTopicCount: number;
  nonEvaluatedCount: number;
  advancedCount: number;
  mediumCount: number;
  weakCount: number;
  scenarioPathSummary: string;
}

export interface Scenario1Report {
  visited: boolean;
  path: string[];
  evaluatedAnswers: Array<{ node: string; answer: string; feedback: string | null; classification: string | null }>;
  supportTurns: Array<{ node: string; query: string; feedback: string | null }>;
  finalOpportunity: string | null;
}

export interface Scenario2Report {
  visited: boolean;
  path: string[];
  initialIdea: string | null;
  marketingResponse: string | null;
  competitionResponse: string | null;
  rebuiltIdea: string | null;
  scalabilityResponse: string | null;
  supportTurns: Array<{ node: string; query: string }>;
}

export interface Scenario3Report {
  visited: boolean;
  path: string[];
  businessModel: BusinessModelBlocks | null;
  detectedGapPath: "pricing_gap" | "cost_gap" | "channel_gap" | "coherent" | "unknown";
  reconciliationAnswer: string | null;
  supportTurns: Array<{ node: string; query: string }>;
}

export interface Scenario4Report {
  visited: boolean;
  path: string[];
  crisisStartTimestamp: string | null;
  choice: "A" | "B" | "C" | null;
  timeout: boolean;
  decisionTimeMs: number | null;
  decisionTimeFormatted: string;
  consequenceNode: string | null;
  recoveryChoice: "A" | "B" | null;
  recoveryStrategy: string | null;
}

export interface Scenario5Report {
  visited: boolean;
  path: string[];
  headlineA: string | null;
  headlineB: string | null;
  selectedCampaign: "A" | "B" | null;
  reasoning: string | null;
  analyticalBranch: "advanced_roi" | "vanity_metric_correction" | "calculation_hint" | "unknown";
  budgetAllocation: string | null;
  fixedBenchmarks: {
    campaignA: string;
    campaignB: string;
  };
}

export interface FullParticipantReport {
  summary: ParticipantSummary;
  scenario1: Scenario1Report;
  scenario2: Scenario2Report;
  scenario3: Scenario3Report;
  scenario4: Scenario4Report;
  scenario5: Scenario5Report;
  chronologicalInteractions: InteractionRecord[];
}


/**
 * Formats a timestamp into an objective human-friendly Arabic relative time string.
 * Example: "الآن", "منذ 3 دقائق", "منذ ساعتين", "منذ يوم"
 */
export function formatRelativeTimeArabic(
  timestamp: string | null | undefined,
  referenceMs: number = Date.now()
): string {
  if (!timestamp) return "لم يبدأ التفاعل بعد";
  const ms = Date.parse(timestamp);
  if (isNaN(ms)) return "لم يبدأ التفاعل بعد";

  const elapsedMs = Math.max(0, referenceMs - ms);
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedMinutes < 1) return "الآن";
  if (elapsedMinutes === 1) return "منذ دقيقة";
  if (elapsedMinutes === 2) return "منذ دقيقتين";
  if (elapsedMinutes >= 3 && elapsedMinutes <= 10) return `منذ ${elapsedMinutes} دقائق`;
  if (elapsedMinutes < 60) return `منذ ${elapsedMinutes} دقيقة`;

  if (elapsedHours === 1) return "منذ ساعة";
  if (elapsedHours === 2) return "منذ ساعتين";
  if (elapsedHours >= 3 && elapsedHours <= 10) return `منذ ${elapsedHours} ساعات`;
  if (elapsedHours < 24) return `منذ ${elapsedHours} ساعة`;

  if (elapsedDays === 1) return "منذ يوم";
  if (elapsedDays === 2) return "منذ يومين";
  if (elapsedDays >= 3 && elapsedDays <= 10) return `منذ ${elapsedDays} أيام`;
  return `منذ ${elapsedDays} يوم`;
}

/**
 * Derives UI-only freshness indicator based on the last interaction timestamp.
 * Threshold: <= 15 minutes is "نشط مؤخرًا", > 15 minutes is "غير نشط حاليًا".
 * Purely a derived UI indicator; never persisted or treated as scientific metric.
 */
export function deriveFreshnessIndicator(
  session: Pick<SessionRecord, "status">,
  lastActivityAt: string | null | undefined,
  referenceMs: number = Date.now()
): { label: string; state: "recent" | "stale" | "completed" | "none" } {
  if (session.status === "completed") {
    return { label: "مكتمل", state: "completed" };
  }
  if (!lastActivityAt) {
    return { label: "لم يبدأ بعد", state: "none" };
  }
  const ms = Date.parse(lastActivityAt);
  if (isNaN(ms)) {
    return { label: "لم يبدأ بعد", state: "none" };
  }
  const elapsedMs = Math.max(0, referenceMs - ms);
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  if (elapsedMinutes <= 15) {
    return { label: "نشط مؤخرًا", state: "recent" };
  }
  return { label: "غير نشط حاليًا", state: "stale" };
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || isNaN(seconds) || seconds < 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} ثانية`;
  if (secs === 0) return `${mins} دقيقة`;
  return `${mins} دقيقة و ${secs} ثانية`;
}

export function deriveParticipantSummary(
  session: SessionRecord,
  interactions: InteractionRecord[] = [],
  referenceMs: number = Date.now()
): ParticipantSummary {
  const sessionInteractions = interactions.filter((i) => i.session_id === session.id);

  let evaluatedCount = 0;
  let supportCount = 0;
  let offTopicCount = 0;
  let nonEvaluatedCount = 0;
  let advancedCount = 0;
  let mediumCount = 0;
  let weakCount = 0;

  for (const inter of sessionInteractions) {
    if (inter.student_answer === "CRISIS_START") continue;

    if (inter.turn_kind === "evaluated_answer") evaluatedCount++;
    else if (inter.turn_kind === "conversational_support") supportCount++;
    else if (inter.turn_kind === "off_topic") offTopicCount++;
    else if (inter.turn_kind === "non_evaluated_answer") nonEvaluatedCount++;

    if (inter.classification === "advanced") advancedCount++;
    else if (inter.classification === "medium") mediumCount++;
    else if (inter.classification === "weak") weakCount++;
  }

  // Determine chronologically latest interaction timestamp for this session
  let lastActivityAt: string | null = null;
  let latestInterMs = -Infinity;
  for (const inter of sessionInteractions) {
    if (inter.created_at) {
      const ms = Date.parse(inter.created_at);
      if (!isNaN(ms) && ms > latestInterMs) {
        latestInterMs = ms;
        lastActivityAt = inter.created_at;
      }
    }
  }

  // Calculate duration according to research rules
  let durationSeconds: number | null = null;
  let durationLabel: string = "المدة المسجلة";

  const isCompleted = session.status === "completed" && !!session.finished_at;

  if (isCompleted) {
    durationLabel = "مدة الجلسة";
    const startMs = Date.parse(session.started_at);
    const finishMs = Date.parse(session.finished_at!);
    if (!isNaN(startMs) && !isNaN(finishMs) && finishMs >= startMs) {
      durationSeconds = Math.floor((finishMs - startMs) / 1000);
    }
  } else {
    // Incomplete / active session: derive recorded_duration = last_activity_at - started_at
    durationLabel = "المدة المسجلة";
    if (lastActivityAt && session.started_at) {
      const startMs = Date.parse(session.started_at);
      const lastMs = Date.parse(lastActivityAt);
      if (!isNaN(startMs) && !isNaN(lastMs) && lastMs >= startMs) {
        durationSeconds = Math.floor((lastMs - startMs) / 1000);
      }
    } else {
      // No interactions stored: duration is null (displayed as "—")
      durationSeconds = null;
    }
  }

  const durationFormatted = durationSeconds !== null ? formatDuration(durationSeconds) : "—";
  const lastActivityRelative = formatRelativeTimeArabic(lastActivityAt, referenceMs);
  const freshness = deriveFreshnessIndicator(session, lastActivityAt, referenceMs);

  // Completed skills calculation
  let completedSkillsCount = 0;
  if (session.status === "completed") {
    completedSkillsCount = 5;
  } else if (session.current_scenario) {
    completedSkillsCount = Math.max(0, session.current_scenario - 1);
  }

  // Path summary per scenario
  const scenariosSeen = new Set(sessionInteractions.map((i) => i.scenario_id ?? 1));
  const pathParts: string[] = [];
  for (const s of Array.from(scenariosSeen).sort((a, b) => a - b)) {
    const sInters = sessionInteractions.filter((i) => (i.scenario_id ?? 1) === s);
    const nodes = sInters.map((i) => i.node_id);
    pathParts.push(`S${s}: ${nodes.join(" → ")}`);
  }

  return {
    sessionId: session.id,
    studentName: session.student_name || "غير محدد",
    studentCode: session.student_code,
    status: session.status,
    startedAt: session.started_at,
    finishedAt: session.finished_at,
    durationSeconds,
    durationFormatted,
    durationLabel,
    lastActivityAt,
    lastActivityRelative,
    freshnessLabel: freshness.label,
    currentScenario: session.current_scenario ?? 1,
    currentNode: session.current_node,
    completedSkillsCount,
    totalInteractions: sessionInteractions.length,
    evaluatedCount,
    supportCount,
    offTopicCount,
    nonEvaluatedCount,
    advancedCount,
    mediumCount,
    weakCount,
    scenarioPathSummary: pathParts.join(" | ") || "لا توجد مسارات مسجلة",
  };
}

export function deriveScenario1Report(interactions: InteractionRecord[]): Scenario1Report {
  const s1 = interactions.filter((i) => (i.scenario_id ?? 1) === 1);
  if (s1.length === 0) {
    return { visited: false, path: [], evaluatedAnswers: [], supportTurns: [], finalOpportunity: null };
  }

  const evaluatedAnswers: Scenario1Report["evaluatedAnswers"] = [];
  const supportTurns: Scenario1Report["supportTurns"] = [];
  let finalOpportunity: string | null = null;

  for (const i of s1) {
    if (i.turn_kind === "evaluated_answer" || i.classification !== null) {
      evaluatedAnswers.push({
        node: i.node_id,
        answer: i.student_answer || "",
        feedback: i.agent_feedback,
        classification: i.classification,
      });
      if (i.node_id === "N5" && i.student_answer) {
        finalOpportunity = i.student_answer;
      }
    } else if (i.turn_kind === "conversational_support") {
      supportTurns.push({
        node: i.node_id,
        query: i.student_answer || "",
        feedback: i.agent_feedback,
      });
    }
  }

  return {
    visited: true,
    path: s1.map((i) => i.node_id),
    evaluatedAnswers,
    supportTurns,
    finalOpportunity,
  };
}

export function deriveScenario2Report(interactions: InteractionRecord[]): Scenario2Report {
  const s2 = interactions.filter((i) => i.scenario_id === 2);
  if (s2.length === 0) {
    return {
      visited: false,
      path: [],
      initialIdea: null,
      marketingResponse: null,
      competitionResponse: null,
      rebuiltIdea: null,
      scalabilityResponse: null,
      supportTurns: [],
    };
  }

  let initialIdea: string | null = null;
  let marketingResponse: string | null = null;
  let competitionResponse: string | null = null;
  let rebuiltIdea: string | null = null;
  let scalabilityResponse: string | null = null;
  const supportTurns: Scenario2Report["supportTurns"] = [];

  for (const i of s2) {
    if (i.turn_kind === "conversational_support") {
      supportTurns.push({ node: i.node_id, query: i.student_answer || "" });
      continue;
    }
    if (i.node_id === "N1" && !initialIdea && i.student_answer) {
      initialIdea = i.student_answer;
    } else if (i.node_id === "N2" && i.student_answer) {
      marketingResponse = i.student_answer;
    } else if (i.node_id === "N3" && i.student_answer) {
      competitionResponse = i.student_answer;
    } else if (i.node_id === "N4" && i.student_answer) {
      rebuiltIdea = i.student_answer;
    } else if (i.node_id === "N5" && i.student_answer) {
      scalabilityResponse = i.student_answer;
    }
  }

  return {
    visited: true,
    path: s2.map((i) => i.node_id),
    initialIdea,
    marketingResponse,
    competitionResponse,
    rebuiltIdea,
    scalabilityResponse,
    supportTurns,
  };
}

export function deriveScenario3Report(interactions: InteractionRecord[]): Scenario3Report {
  const s3 = interactions.filter((i) => i.scenario_id === 3);
  if (s3.length === 0) {
    return {
      visited: false,
      path: [],
      businessModel: null,
      detectedGapPath: "unknown",
      reconciliationAnswer: null,
      supportTurns: [],
    };
  }

  let businessModel: BusinessModelBlocks | null = null;
  let detectedGapPath: Scenario3Report["detectedGapPath"] = "unknown";
  let reconciliationAnswer: string | null = null;
  const supportTurns: Scenario3Report["supportTurns"] = [];

  for (const i of s3) {
    if (i.turn_kind === "conversational_support") {
      supportTurns.push({ node: i.node_id, query: i.student_answer || "" });
      continue;
    }
    if (i.node_id === "N1" && i.student_answer) {
      businessModel = deserializeBusinessModel(i.student_answer);
    }
    if (i.node_id === "N2_A" || i.next_node === "N2_A") detectedGapPath = "pricing_gap";
    else if (i.node_id === "N2_B" || i.next_node === "N2_B") detectedGapPath = "cost_gap";
    else if (i.node_id === "N2_C" || i.next_node === "N2_C") detectedGapPath = "channel_gap";
    else if ((i.node_id === "N4" || i.next_node === "N4") && detectedGapPath === "unknown") detectedGapPath = "coherent";

    if (["N2_A", "N2_B", "N2_C", "N3"].includes(i.node_id) && i.student_answer) {
      reconciliationAnswer = i.student_answer;
    }
  }

  return {
    visited: true,
    path: s3.map((i) => i.node_id),
    businessModel,
    detectedGapPath,
    reconciliationAnswer,
    supportTurns,
  };
}

export function deriveScenario4Report(interactions: InteractionRecord[]): Scenario4Report {
  const s4 = interactions.filter((i) => i.scenario_id === 4);
  if (s4.length === 0) {
    return {
      visited: false,
      path: [],
      crisisStartTimestamp: null,
      choice: null,
      timeout: false,
      decisionTimeMs: null,
      decisionTimeFormatted: "—",
      consequenceNode: null,
      recoveryChoice: null,
      recoveryStrategy: null,
    };
  }

  const startAnchor = s4.find((i) => i.node_id === "N2" && i.student_answer === "CRISIS_START");
  const crisisDecision = s4.find((i) => i.node_id === "N2" && i.student_answer !== "CRISIS_START");
  const recoveryDecision = s4.find((i) => i.node_id === "N4");

  let choice: "A" | "B" | "C" | null = null;
  let timeout = false;
  let decisionTimeMs: number | null = null;
  let consequenceNode: string | null = null;

  if (crisisDecision) {
    decisionTimeMs = crisisDecision.decision_time_ms;
    consequenceNode = crisisDecision.next_node;
    if (crisisDecision.student_answer) {
      const parsed = deserializeCrisisDecision(crisisDecision.student_answer);
      if (parsed) {
        choice = parsed.choice;
        timeout = parsed.timeout;
      }
    }
  }

  let recoveryChoice: "A" | "B" | null = null;
  let recoveryStrategy: string | null = null;

  if (recoveryDecision && recoveryDecision.student_answer) {
    const parsedRec = deserializeRecoveryDecision(recoveryDecision.student_answer);
    if (parsedRec) {
      recoveryChoice = parsedRec.choice;
      recoveryStrategy =
        parsedRec.choice === "A"
          ? "شفافية كاملة مع العملاء والجمهور"
          : "إخفاء السبب واعتباره تحديثاً روتينياً";
    }
  }

  const decisionTimeFormatted =
    decisionTimeMs !== null
      ? `${(decisionTimeMs / 1000).toFixed(2)} ثانية (${decisionTimeMs} ms)`
      : "—";

  return {
    visited: true,
    path: s4.map((i) => i.node_id),
    crisisStartTimestamp: startAnchor?.created_at ?? null,
    choice,
    timeout,
    decisionTimeMs,
    decisionTimeFormatted,
    consequenceNode,
    recoveryChoice,
    recoveryStrategy,
  };
}

export function deriveScenario5Report(interactions: InteractionRecord[]): Scenario5Report {
  const s5 = interactions.filter((i) => i.scenario_id === 5);
  if (s5.length === 0) {
    return {
      visited: false,
      path: [],
      headlineA: null,
      headlineB: null,
      selectedCampaign: null,
      reasoning: null,
      analyticalBranch: "unknown",
      budgetAllocation: null,
      fixedBenchmarks: {
        campaignA: "1000 زيارة / 5 عملاء (تكلفة الاستحواذ = 20$)",
        campaignB: "200 زيارة / 20 عميل (تكلفة الاستحواذ = 5$)",
      },
    };
  }

  let headlineA: string | null = null;
  let headlineB: string | null = null;
  let selectedCampaign: "A" | "B" | null = null;
  let reasoning: string | null = null;
  let analyticalBranch: Scenario5Report["analyticalBranch"] = "unknown";
  let budgetAllocation: string | null = null;

  for (const i of s5) {
    if (i.node_id === "N1" && i.student_answer) {
      const parsedHeadlines = deserializeHeadlines(i.student_answer);
      if (parsedHeadlines) {
        headlineA = parsedHeadlines.headlineA;
        headlineB = parsedHeadlines.headlineB;
      }
    } else if (i.node_id === "N2" && i.student_answer) {
      const parsedCamp = deserializeCampaignDecision(i.student_answer);
      if (parsedCamp) {
        selectedCampaign = parsedCamp.selectedChoice === "choose_b" ? "B" : "A";
        reasoning = parsedCamp.reasoning;
      }
      if (i.next_node === "N3_B") analyticalBranch = "advanced_roi";
      else if (i.next_node === "N3_A") analyticalBranch = "vanity_metric_correction";
      else if (i.next_node === "N3_C") analyticalBranch = "calculation_hint";
    } else if (i.node_id === "N4" && i.student_answer) {
      budgetAllocation = i.student_answer;
    }
  }

  return {
    visited: true,
    path: s5.map((i) => i.node_id),
    headlineA,
    headlineB,
    selectedCampaign,
    reasoning,
    analyticalBranch,
    budgetAllocation: budgetAllocation || "800 دولار للحملة (ب)",
    fixedBenchmarks: {
      campaignA: "1000 زيارة / 5 عملاء (تكلفة الاستحواذ = 20$)",
      campaignB: "200 زيارة / 20 عميل (تكلفة الاستحواذ = 5$)",
    },
  };
}

export function deriveFullParticipantReport(
  session: SessionRecord,
  interactions: InteractionRecord[]
): FullParticipantReport {
  const sessionInteractions = interactions.filter((i) => i.session_id === session.id);
  return {
    summary: deriveParticipantSummary(session, sessionInteractions),
    scenario1: deriveScenario1Report(sessionInteractions),
    scenario2: deriveScenario2Report(sessionInteractions),
    scenario3: deriveScenario3Report(sessionInteractions),
    scenario4: deriveScenario4Report(sessionInteractions),
    scenario5: deriveScenario5Report(sessionInteractions),
    chronologicalInteractions: sessionInteractions,
  };
}

/**
 * Sanitizes a CSV cell to prevent spreadsheet formula injection.
 * If a string begins with '=', '+', '-', or '@', prefixes with single quote.
 * Escapes double quotes and encloses in quotes.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Prevent spreadsheet formula injection in Excel/Google Sheets
  if (str.length > 0 && ["=", "+", "-", "@"].includes(str.charAt(0))) {
    str = "'" + str;
  }

  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function generateParticipantInteractionsCsv(
  sessions: SessionRecord[],
  interactions: InteractionRecord[]
): string {
  const BOM = "﻿";
  const headers = [
    "student_name",
    "student_code",
    "status",
    "scenario_version",
    "prompt_version",
    "started_at",
    "finished_at",
    "scenario_id",
    "node_id",
    "turn_kind",
    "student_answer",
    "classification",
    "agent_feedback",
    "next_node",
    "decision_time_ms",
    "created_at",
  ];

  const sessionMap = new Map<string, SessionRecord>();
  for (const s of sessions) {
    sessionMap.set(s.id, s);
  }

  const rows: string[] = [headers.map(sanitizeCsvCell).join(",")];

  for (const inter of interactions) {
    const s = sessionMap.get(inter.session_id);
    const row = [
      sanitizeCsvCell(s?.student_name ?? "غير محدد"),
      sanitizeCsvCell(s?.student_code ?? ""),
      sanitizeCsvCell(s?.status ?? ""),
      sanitizeCsvCell(s?.scenario_version ?? ""),
      sanitizeCsvCell(s?.prompt_version ?? ""),
      sanitizeCsvCell(s?.started_at ?? ""),
      sanitizeCsvCell(s?.finished_at ?? ""),
      sanitizeCsvCell(inter.scenario_id ?? 1),
      sanitizeCsvCell(inter.node_id),
      sanitizeCsvCell(inter.turn_kind ?? ""),
      sanitizeCsvCell(inter.student_answer ?? ""),
      sanitizeCsvCell(inter.classification ?? ""),
      sanitizeCsvCell(inter.agent_feedback ?? ""),
      sanitizeCsvCell(inter.next_node ?? ""),
      sanitizeCsvCell(inter.decision_time_ms ?? ""),
      sanitizeCsvCell(inter.created_at),
    ];
    rows.push(row.join(","));
  }

  return BOM + rows.join("\r\n");
}
