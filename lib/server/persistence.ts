/**
 * Server-only persistence layer for research experiment sessions and interactions.
 *
 * Source of Truth: PROJECT.md Section 6, SCENARIO_SPEC.md, PILOT_ISSUES.md, and research/scenarios/JOURNEY.md
 * Architecture Invariant:
 *   - AI evaluates intent, classification + feedback
 *   - Application code deterministically calculates transitions and next_node
 *   - Persistence stores already-decided values, turn_kind, and scenario_id
 */

import type { NodeId } from "../scenario";
import type { Classification } from "../transitions";
import { getSupabaseServerClient } from "./supabase";

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

/**
 * Creates a new research session row in public.sessions.
 * Database generates id and started_at, leaving finished_at as null.
 */
export async function createSession(
  input: CreateSessionInput
): Promise<SessionRecord> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      student_name: input.studentName ?? null,
      student_code: input.studentCode,
      status: input.status,
      current_scenario: input.currentScenario ?? null,
      current_node: input.currentNode,
      scenario_version: input.scenarioVersion,
      prompt_version: input.promptVersion,
      provider: input.provider,
      model_id: input.modelId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to create session", { cause: error });
  }

  return data as SessionRecord;
}

/**
 * Persists an interaction turn in public.interactions.
 * Supports evaluated turns, conversational support, off-topic turns, and non-evaluated turns.
 * Supports nullable scenario_id for five-scenario journey tracking.
 */
export async function recordInteraction(
  input: RecordInteractionInput
): Promise<InteractionRecord> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("interactions")
    .insert({
      session_id: input.sessionId,
      scenario_id: input.scenarioId ?? null,
      node_id: input.nodeId,
      student_answer: input.studentAnswer ?? null,
      classification: input.classification ?? null,
      agent_feedback: input.agentFeedback ?? null,
      next_node: input.nextNode ?? null,
      decision_time_ms: input.decisionTimeMs ?? null,
      turn_kind: input.turnKind ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to record interaction", { cause: error });
  }

  return data as InteractionRecord;
}

/**
 * Updates an existing session's current_node, current_scenario, status, and/or finished_at
 * in public.sessions based on already-decided application state.
 */
export async function updateSessionState(
  input: UpdateSessionStateInput
): Promise<SessionRecord> {
  const supabase = getSupabaseServerClient();

  const updatePayload: Record<string, unknown> = {};

  if (input.currentNode !== undefined) {
    updatePayload.current_node = input.currentNode;
  }
  if (input.currentScenario !== undefined) {
    updatePayload.current_scenario = input.currentScenario;
  }
  if (input.status !== undefined) {
    updatePayload.status = input.status;
  }
  if (input.finishedAt !== undefined) {
    updatePayload.finished_at = input.finishedAt;
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updatePayload)
    .eq("id", input.sessionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to update session state", { cause: error });
  }

  return data as SessionRecord;
}

/**
 * Loads an existing session record by its primary ID.
 * Returns null if the session does not exist.
 */
export async function getSessionById(
  sessionId: string
): Promise<SessionRecord | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load session", { cause: error });
  }

  return data as SessionRecord | null;
}

/**
 * Retrieves all sessions for a given student_code, ordered by started_at descending.
 */
export async function getSessionsByStudentCode(
  studentCode: string
): Promise<SessionRecord[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_code", studentCode)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load sessions for student code", { cause: error });
  }

  return (data || []) as SessionRecord[];
}

export interface RestorationInteraction {
  node_id: NodeId;
  student_answer: string | null;
  agent_feedback: string | null;
  next_node: NodeId | null;
  turn_kind: TurnKind | null;
  created_at: string;
}

/**
 * Retrieves past interactions for a session in deterministic chronological order.
 * Selects only the fields necessary for client-side transcript reconstruction.
 */
export async function getInteractionsForSession(
  sessionId: string
): Promise<RestorationInteraction[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("interactions")
    .select("node_id, student_answer, agent_feedback, next_node, turn_kind, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error("Failed to load interactions for session", { cause: error });
  }

  return (data || []) as RestorationInteraction[];
}

/**
 * Returns the count of prior conversational support turns for this session at the given node.
 * Used for progressive scaffolding without modifying session schema.
 */
export async function getSupportTurnCount(
  sessionId: string,
  nodeId: NodeId
): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("node_id", nodeId)
    .eq("turn_kind", "conversational_support");

  if (error) {
    return 0;
  }
  return count ?? 0;
}

/**
 * Retrieves recent interactions for bounded conversational context.
 */
export async function getRecentInteractionsForSession(
  sessionId: string,
  limit: number = 6
): Promise<Array<{ student_answer: string | null; agent_feedback: string | null; turn_kind: TurnKind | null }>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("interactions")
    .select("student_answer, agent_feedback, turn_kind")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }
  return (data as Array<{ student_answer: string | null; agent_feedback: string | null; turn_kind: TurnKind | null }>).reverse();
}