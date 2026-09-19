import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeCsvCell,
  generateParticipantInteractionsCsv,
} from "../lib/research/report";
import type { SessionRecord, InteractionRecord } from "../lib/server/persistence";

describe("CSV Generation & Formula Injection Mitigation", () => {
  it("1. sanitizeCsvCell wraps values in double quotes and escapes internal quotes", () => {
    assert.equal(sanitizeCsvCell("مرحبا"), '"مرحبا"');
    assert.equal(sanitizeCsvCell('قال: "نعم"'), '"قال: ""نعم"""');
    assert.equal(sanitizeCsvCell(null), '""');
    assert.equal(sanitizeCsvCell(undefined), '""');
    assert.equal(sanitizeCsvCell(123), '"123"');
  });

  it("2. sanitizeCsvCell mitigates spreadsheet formula injection by prefixing dangerous characters with single quote", () => {
    // Dangerous leading characters: =, +, -, @
    assert.equal(sanitizeCsvCell("=SUM(A1:A10)"), '"\'=SUM(A1:A10)"');
    assert.equal(sanitizeCsvCell("+12345"), '"\'+12345"');
    assert.equal(sanitizeCsvCell("-500 ريال"), '"\'-500 ريال"');
    assert.equal(sanitizeCsvCell("@special_formula"), '"\'@special_formula"');

    // Normal text starting with Arabic or standard alphanumeric is NOT modified with single quote
    assert.equal(sanitizeCsvCell("خصم 50%"), '"خصم 50%"');
    assert.equal(sanitizeCsvCell("ميزانية 100$"), '"ميزانية 100$"');
    assert.equal(sanitizeCsvCell("A/B Testing"), '"A/B Testing"');
  });

  it("3. generateParticipantInteractionsCsv prepends UTF-8 BOM for Arabic Excel compatibility", () => {
    const mockSessions: SessionRecord[] = [
      {
        id: "s1",
        student_name: "فاطمة الزهراء",
        student_code: "STU_ARABIC_01",
        status: "completed",
        current_scenario: 5,
        current_node: "END",
        scenario_version: "2.0-dev",
        prompt_version: "0.3",
        provider: "groq",
        model_id: "openai/gpt-oss-120b",
        started_at: "2026-09-20T10:00:00.000Z",
        finished_at: "2026-09-20T10:20:00.000Z",
      },
    ];

    const mockInteractions: InteractionRecord[] = [
      {
        id: "i1",
        session_id: "s1",
        scenario_id: 1,
        node_id: "N1",
        student_answer: "=1+1 formula test",
        classification: "advanced",
        agent_feedback: "تغذية راجعة ممتازة",
        next_node: "N2",
        decision_time_ms: 12000,
        turn_kind: "evaluated_answer",
        created_at: "2026-09-20T10:01:00.000Z",
      },
    ];

    const csv = generateParticipantInteractionsCsv(mockSessions, mockInteractions);

    // Check BOM
    assert.equal(csv.charCodeAt(0), 0xFEFF, "First character must be UTF-8 BOM");

    // Check header presence
    assert.ok(csv.includes('"student_name"'));
    assert.ok(csv.includes('"student_code"'));
    assert.ok(csv.includes('"student_answer"'));
    assert.ok(csv.includes('"decision_time_ms"'));

    // Check participant data row presence
    assert.ok(csv.includes('"فاطمة الزهراء"'));
    assert.ok(csv.includes('"STU_ARABIC_01"'));
    assert.ok(csv.includes('"\'=1+1 formula test"'), "Dangerous formula must be prefixed with single quote");
    assert.ok(csv.includes('"تغذية راجعة ممتازة"'));
  });

  it("4. handles multiline answers safely inside quotes", () => {
    const mockSessions: SessionRecord[] = [
      {
        id: "s1",
        student_name: "مشارك تجريبي",
        student_code: "MULTI_LINE_01",
        status: "active",
        current_scenario: 1,
        current_node: "N1",
        scenario_version: "2.0-dev",
        prompt_version: "0.3",
        provider: "groq",
        model_id: "openai/gpt-oss-120b",
        started_at: "2026-09-20T10:00:00.000Z",
        finished_at: null,
      },
    ];

    const multilineAnswer = "السطر الأول من الإجابة\nالسطر الثاني\nالسطر الثالث";
    const mockInteractions: InteractionRecord[] = [
      {
        id: "i1",
        session_id: "s1",
        scenario_id: 1,
        node_id: "N1",
        student_answer: multilineAnswer,
        classification: null,
        agent_feedback: null,
        next_node: "N2",
        decision_time_ms: null,
        turn_kind: "evaluated_answer",
        created_at: "2026-09-20T10:01:00.000Z",
      },
    ];

    const csv = generateParticipantInteractionsCsv(mockSessions, mockInteractions);
    assert.ok(csv.includes('"السطر الأول من الإجابة\nالسطر الثاني\nالسطر الثالث"'));
  });
});
