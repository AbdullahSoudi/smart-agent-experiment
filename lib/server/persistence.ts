/**
 * Server-only persistence layer for research experiment sessions and interactions.
 * Powered by Neon PostgreSQL serverless driver.
 *
 * Source of Truth: PROJECT.md Section 6, SCENARIO_SPEC.md, PILOT_ISSUES.md, and research/scenarios/JOURNEY.md
 * Architecture Invariant:
 *   - AI evaluates intent, classification + feedback
 *   - Application code deterministically calculates transitions and next_node
 *   - Persistence stores already-decided values, turn_kind, and scenario_id
 */

import { isSequentialJourneyVersion, type NodeId } from "../scenario";
import type { Classification } from "../transitions";

async function getDatabase() {
  const { getDb } = await import("./db");
  return getDb();
}

export type TurnKind =
  | "evaluated_answer"
  | "conversational_support"
  | "off_topic"
  | "non_evaluated_answer";

export interface SessionRecord {
  id: string;
  student_name: string | null;
  student_code: string;
  status: string;
  current_scenario: number | null;
  current_node: NodeId;
  scenario_version: string;
  prompt_version: string;
  provider: string;
  model_id: string;
  started_at: string;
  finished_at: string | null;
}

export interface InteractionRecord {
  id: string;
  session_id: string;
  scenario_id: number | null;
  node_id: NodeId;
  student_answer: string | null;
  classification: Classification | null;
  agent_feedback: string | null;
  next_node: NodeId | null;
  decision_time_ms: number | null;
  turn_kind: TurnKind | null;
  created_at: string;
}

export interface CreateSessionInput {
  studentName?: string | null;
  studentCode: string;
  status: string;
  currentScenario?: number | null;
  currentNode: NodeId;
  scenarioVersion: string;
  promptVersion: string;
  provider: string;
  modelId: string;
}

export interface RecordInteractionInput {
  sessionId: string;
  scenarioId?: number | null;
  nodeId: NodeId;
  studentAnswer?: string | null;
  classification?: Classification | null;
  agentFeedback?: string | null;
  nextNode?: NodeId | null;
  decisionTimeMs?: number | null;
  turnKind?: TurnKind | null;
}

export interface UpdateSessionStateInput {
  sessionId: string;
  currentNode?: NodeId;
  currentScenario?: number | null;
  status?: string;
  finishedAt?: string | null;
}

export interface RestorationInteraction {
  scenario_id?: number | null;
  node_id: NodeId;
  student_answer: string | null;
  agent_feedback: string | null;
  next_node: NodeId | null;
  turn_kind: TurnKind | null;
  created_at: string;
}

function normalizeSessionRow(row: any): SessionRecord {
  return {
    id: row.id,
    student_name: row.student_name ?? null,
    student_code: row.student_code,
    status: row.status,
    current_scenario: row.current_scenario ?? null,
    current_node: row.current_node as NodeId,
    scenario_version: row.scenario_version,
    prompt_version: row.prompt_version,
    provider: row.provider,
    model_id: row.model_id,
    started_at:
      row.started_at instanceof Date
        ? row.started_at.toISOString()
        : String(row.started_at),
    finished_at:
      row.finished_at instanceof Date
        ? row.finished_at.toISOString()
        : row.finished_at
        ? String(row.finished_at)
        : null,
  };
}

function normalizeInteractionRow(row: any): InteractionRecord {
  return {
    id: row.id,
    session_id: row.session_id,
    scenario_id: row.scenario_id ?? null,
    node_id: row.node_id as NodeId,
    student_answer: row.student_answer ?? null,
    classification: (row.classification as Classification) ?? null,
    agent_feedback: row.agent_feedback ?? null,
    next_node: (row.next_node as NodeId) ?? null,
    decision_time_ms: row.decision_time_ms ?? null,
    turn_kind: (row.turn_kind as TurnKind) ?? null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

/**
 * Creates a new research session row in sessions.
 * Database generates id and started_at, leaving finished_at as null.
 */
export async function createSession(
  input: CreateSessionInput
): Promise<SessionRecord> {
  const sql = await getDatabase();

  const rows = (await sql`
    INSERT INTO sessions (
      student_name,
      student_code,
      status,
      current_scenario,
      current_node,
      scenario_version,
      prompt_version,
      provider,
      model_id
    ) VALUES (
      ${input.studentName ?? null},
      ${input.studentCode},
      ${input.status},
      ${input.currentScenario ?? null},
      ${input.currentNode},
      ${input.scenarioVersion},
      ${input.promptVersion},
      ${input.provider},
      ${input.modelId}
    )
    RETURNING *;
  `) as unknown[];

  if (!rows || rows.length === 0) {
    throw new Error("Failed to create session");
  }

  return normalizeSessionRow(rows[0]);
}

/**
 * Persists an interaction turn in interactions.
 * Supports evaluated turns, conversational support, off-topic turns, and non-evaluated turns.
 * Supports nullable scenario_id for five-scenario journey tracking.
 */
export async function recordInteraction(
  input: RecordInteractionInput
): Promise<InteractionRecord> {
  const sql = await getDatabase();

  const rows = (await sql`
    INSERT INTO interactions (
      session_id,
      scenario_id,
      node_id,
      student_answer,
      classification,
      agent_feedback,
      next_node,
      decision_time_ms,
      turn_kind
    ) VALUES (
      ${input.sessionId},
      ${input.scenarioId ?? null},
      ${input.nodeId},
      ${input.studentAnswer ?? null},
      ${input.classification ?? null},
      ${input.agentFeedback ?? null},
      ${input.nextNode ?? null},
      ${input.decisionTimeMs ?? null},
      ${input.turnKind ?? null}
    )
    RETURNING *;
  `) as unknown[];

  if (!rows || rows.length === 0) {
    throw new Error("Failed to record interaction");
  }

  return normalizeInteractionRow(rows[0]);
}

/**
 * Updates an existing session's current_node, current_scenario, status, and/or finished_at
 * in sessions based on already-decided application state.
 */
export async function updateSessionState(
  input: UpdateSessionStateInput
): Promise<SessionRecord> {
  const sql = await getDatabase();

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.currentNode !== undefined) {
    setClauses.push(`current_node = $${paramIdx++}`);
    params.push(input.currentNode);
  }
  if (input.currentScenario !== undefined) {
    setClauses.push(`current_scenario = $${paramIdx++}`);
    params.push(input.currentScenario);
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    params.push(input.status);
  }
  if (input.finishedAt !== undefined) {
    setClauses.push(`finished_at = $${paramIdx++}`);
    params.push(input.finishedAt);
  }

  if (setClauses.length === 0) {
    const existing = await getSessionById(input.sessionId);
    if (!existing) {
      throw new Error("Failed to update session state: session not found");
    }
    return existing;
  }

  params.push(input.sessionId);
  const query = `UPDATE sessions SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *;`;
  const rows = (await sql.query(query, params)) as unknown[];

  if (!rows || rows.length === 0) {
    throw new Error("Failed to update session state");
  }

  return normalizeSessionRow(rows[0]);
}

/**
 * Loads an existing session record by its primary ID.
 * Returns null if the session does not exist.
 */
export async function getSessionById(
  sessionId: string
): Promise<SessionRecord | null> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT *
    FROM sessions
    WHERE id = ${sessionId}
    LIMIT 1;
  `) as unknown[];

  if (!rows || rows.length === 0) {
    return null;
  }

  return normalizeSessionRow(rows[0]);
}

/**
 * Retrieves all sessions for a given student_code, ordered by started_at descending.
 */
export async function getSessionsByStudentCode(
  studentCode: string
): Promise<SessionRecord[]> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT *
    FROM sessions
    WHERE student_code = ${studentCode}
    ORDER BY started_at DESC;
  `) as unknown[];

  return (rows || []).map(normalizeSessionRow);
}

/**
 * Retrieves past interactions for a session in deterministic chronological order.
 * Selects only the fields necessary for client-side transcript reconstruction.
 */
export async function getInteractionsForSession(
  sessionId: string
): Promise<RestorationInteraction[]> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT node_id, student_answer, agent_feedback, next_node, turn_kind, created_at, scenario_id
    FROM interactions
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC, id ASC;
  `) as any[];

  return (rows || []).map((row) => ({
    scenario_id: row.scenario_id ?? null,
    node_id: row.node_id as NodeId,
    student_answer: row.student_answer ?? null,
    agent_feedback: row.agent_feedback ?? null,
    next_node: (row.next_node as NodeId) ?? null,
    turn_kind: (row.turn_kind as TurnKind) ?? null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }));
}

/**
 * Returns the count of prior conversational support turns for this session at the given node.
 * Used for progressive scaffolding without modifying session schema.
 */
export async function getSupportTurnCount(
  sessionId: string,
  nodeId: NodeId
): Promise<number> {
  // eq("turn_kind", "conversational_support")
  const sql = await getDatabase();

  try {
    const rows = (await sql`
      SELECT COUNT(*)::text AS count
      FROM interactions
      WHERE session_id = ${sessionId}
        AND node_id = ${nodeId}
        AND turn_kind = 'conversational_support';
    `) as Array<{ count?: string }>;

    if (!rows || rows.length === 0 || !rows[0].count) {
      return 0;
    }

    return parseInt(rows[0].count, 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Retrieves recent interactions for bounded conversational context.
 */
export async function getRecentInteractionsForSession(
  sessionId: string,
  limit: number = 6
): Promise<Array<{ student_answer: string | null; agent_feedback: string | null; turn_kind: TurnKind | null }>> {
  const sql = await getDatabase();

  try {
    const rows = (await sql`
      SELECT student_answer, agent_feedback, turn_kind
      FROM interactions
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `) as Array<{ student_answer: string | null; agent_feedback: string | null; turn_kind: TurnKind | null }>;

    if (!rows || rows.length === 0) {
      return [];
    }

    return [...rows].reverse();
  } catch {
    return [];
  }
}

/**
 * Atomically advances the session currentNode if and only if the session is currently
 * at `fromNode` and in `scenarioId`. Returns true if this transition won the race,
 * false if another concurrent request or timeout already transitioned the session.
 */
export async function advanceCrisisDecisionConditional(
  sessionId: string,
  fromNode: string,
  toNode: string,
  scenarioId: number
): Promise<boolean> {
  const sql = await getDatabase();

  const rows = (await sql`
    UPDATE sessions
    SET current_node = ${toNode}
    WHERE id = ${sessionId}
      AND current_node = ${fromNode}
      AND current_scenario = ${scenarioId}
    RETURNING id;
  `) as Array<{ id: string }>;

  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Retrieves the idempotent crisis-start interaction for S4 if it exists.
 */
export async function getCrisisStartInteraction(
  sessionId: string
): Promise<InteractionRecord | null> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT *
    FROM interactions
    WHERE session_id = ${sessionId}
      AND scenario_id = 4
      AND node_id = 'N2'
      AND student_answer = 'CRISIS_START'
    ORDER BY created_at ASC
    LIMIT 1;
  `) as unknown[];

  if (!rows || rows.length === 0) return null;
  return normalizeInteractionRow(rows[0]);
}

/**
 * Ensures exactly one crisis-start interaction is persisted as the authoritative
 * server-backed timing anchor for Scenario 4.
 */
export async function ensureCrisisStartInteraction(
  sessionId: string
): Promise<InteractionRecord> {
  const existing = await getCrisisStartInteraction(sessionId);
  if (existing) {
    return existing;
  }
  return await recordInteraction({
    sessionId,
    scenarioId: 4,
    nodeId: "N2",
    studentAnswer: "CRISIS_START",
    turnKind: "non_evaluated_answer",
    classification: null,
    agentFeedback: null,
    nextNode: null,
  });
}

/**
 * Retrieves the persisted final crisis decision interaction if already resolved.
 */
export async function getCrisisDecisionInteraction(
  sessionId: string
): Promise<InteractionRecord | null> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT *
    FROM interactions
    WHERE session_id = ${sessionId}
      AND scenario_id = 4
      AND node_id = 'N2'
      AND (student_answer IS NULL OR student_answer != 'CRISIS_START')
    ORDER BY created_at ASC
    LIMIT 1;
  `) as unknown[];

  if (!rows || rows.length === 0) return null;
  return normalizeInteractionRow(rows[0]);
}

/**
 * Predicate to determine if a session qualifies as a sequential research participant.
 * Must have structural participant identity (student_name, current_scenario)
 * and participate in the sequential journey (2.0 or 2.0-dev).
 */
export function isSequentialParticipantSession(
  session: Pick<SessionRecord, "student_name" | "current_scenario" | "scenario_version">
): boolean {
  if (!session.student_name || session.student_name.trim().length === 0) return false;
  if (session.current_scenario === null || session.current_scenario === undefined) return false;
  return isSequentialJourneyVersion(session.scenario_version);
}

/**
 * Retrieves all sequential journey sessions (where student_name and current_scenario are populated).
 * Excludes legacy 1.x pilot sessions without student identity.
 */
export async function getSequentialSessions(): Promise<SessionRecord[]> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT *
    FROM sessions
    WHERE student_name IS NOT NULL
      AND current_scenario IS NOT NULL
    ORDER BY started_at DESC;
  `) as unknown[];

  if (!rows || rows.length === 0) return [];
  return rows.map(normalizeSessionRow).filter(isSequentialParticipantSession);
}

/**
 * Retrieves all interactions for a list of session IDs, ordered chronologically.
 */
export async function getInteractionsForMultipleSessions(
  sessionIds: string[]
): Promise<InteractionRecord[]> {
  if (sessionIds.length === 0) return [];
  const sql = await getDatabase();

  const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(", ");
  const query = `
    SELECT *
    FROM interactions
    WHERE session_id IN (${placeholders})
    ORDER BY created_at ASC;
  `;

  const rows = (await sql.query(query, sessionIds)) as unknown[];
  if (!rows || rows.length === 0) return [];
  return rows.map(normalizeInteractionRow);
}

/**
 * Retrieves initial student idea from Scenario 2 Node 1 for bounded evolution context.
 */
export async function getScenario2InitialIdea(
  sessionId: string
): Promise<string | null> {
  const sql = await getDatabase();

  const rows = (await sql`
    SELECT student_answer
    FROM interactions
    WHERE session_id = ${sessionId}
      AND scenario_id = 2
      AND node_id = 'N1'
    ORDER BY created_at DESC
    LIMIT 1;
  `) as Array<{ student_answer: string | null }>;

  return rows[0]?.student_answer ?? null;
}
