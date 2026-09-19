import test from "node:test";
import assert from "node:assert/strict";
import {
  validateScenario3AuditResult,
  validateScenario3ReconciliationResult,
} from "../lib/server/evaluator-s3";

test("Scenario 3 Strict AI Output Schema & Invariants", async (t) => {
  await t.test("Valid answer with 'pricing_gap' enum parses successfully", () => {
    const input = {
      intent: "answer",
      auditResult: "pricing_gap",
      feedback: "هناك فجوة بين قدرة الشريحة والتسعير.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.intent, "answer");
    assert.equal(result.auditResult, "pricing_gap");
    assert.equal(result.feedback, input.feedback);
  });

  await t.test("Valid answer with 'cost_gap' enum parses successfully", () => {
    const input = {
      intent: "answer",
      auditResult: "cost_gap",
      feedback: "هناك فجوة بين القيمة والتكاليف التشغيلية.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.auditResult, "cost_gap");
  });

  await t.test("Valid answer with 'channel_gap' enum parses successfully", () => {
    const input = {
      intent: "answer",
      auditResult: "channel_gap",
      feedback: "هناك فجوة بين سلوك الشريحة والقناة.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.auditResult, "channel_gap");
  });

  await t.test("Valid answer with 'coherent' enum parses successfully", () => {
    const input = {
      intent: "answer",
      auditResult: "coherent",
      feedback: "النموذج متوافق منطقياً بشكل ممتاز.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.auditResult, "coherent");
  });

  await t.test("Valid support intent with null auditResult parses successfully", () => {
    const input = {
      intent: "support",
      auditResult: null,
      feedback: "القيمة المقدمة تعني الفائدة الأساسية للعميل.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.intent, "support");
    assert.equal(result.auditResult, null);
  });

  await t.test("Valid support intent with string 'null' parses to null", () => {
    const input = {
      intent: "support",
      auditResult: "null",
      feedback: "توضيح لمصادر الإيرادات.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.auditResult, null);
  });

  await t.test("Valid off_topic intent with null parses successfully", () => {
    const input = {
      intent: "off_topic",
      auditResult: null,
      feedback: "أهلاً بك، دعنا نركز على إكمال نموذج العمل.",
    };
    const result = validateScenario3AuditResult(input);
    assert.equal(result.intent, "off_topic");
    assert.equal(result.auditResult, null);
  });

  await t.test("Rejects missing required field (missing feedback)", () => {
    const input = {
      intent: "answer",
      auditResult: "pricing_gap",
    };
    assert.throws(() => validateScenario3AuditResult(input), /Technical Error/);
  });

  await t.test("Rejects extra unexpected field", () => {
    const input = {
      intent: "answer",
      auditResult: "pricing_gap",
      feedback: "تعليق",
      extraField: "hack",
    };
    assert.throws(() => validateScenario3AuditResult(input), /Technical Error/);
  });

  await t.test("Rejects invalid auditResult enum", () => {
    const input = {
      intent: "answer",
      auditResult: "advanced", // Inappropriate classification enum!
      feedback: "تعليق",
    };
    assert.throws(() => validateScenario3AuditResult(input), /Technical Invariant Error/);
  });

  await t.test("Rejects answer with null auditResult", () => {
    const input = {
      intent: "answer",
      auditResult: null,
      feedback: "تعليق",
    };
    assert.throws(() => validateScenario3AuditResult(input), /Technical Invariant Error/);
  });

  await t.test("Rejects support with non-null auditResult", () => {
    const input = {
      intent: "support",
      auditResult: "pricing_gap",
      feedback: "تعليق",
    };
    assert.throws(() => validateScenario3AuditResult(input), /Technical Invariant Error/);
  });

  await t.test("Rejects malformed types (non-object or null)", () => {
    assert.throws(() => validateScenario3AuditResult(null), /Technical Error/);
    assert.throws(() => validateScenario3AuditResult("string"), /Technical Error/);
    assert.throws(() => validateScenario3AuditResult([1, 2, 3]), /Technical Error/);
  });

  await t.test("Reconciliation: Valid resolved attempt parses", () => {
    const input = {
      intent: "answer",
      resolution: "resolved",
      feedback: "ممتاز، الآن تم حل التعارض.",
    };
    const result = validateScenario3ReconciliationResult(input);
    assert.equal(result.resolution, "resolved");
  });

  await t.test("Reconciliation: Valid unresolved attempt parses", () => {
    const input = {
      intent: "answer",
      resolution: "unresolved",
      feedback: "لا يزال هناك تعارض، إليك التوجيه المباشر.",
    };
    const result = validateScenario3ReconciliationResult(input);
    assert.equal(result.resolution, "unresolved");
  });

  await t.test("Reconciliation: Support with null resolution parses", () => {
    const input = {
      intent: "support",
      resolution: null,
      feedback: "يمكنك مراجعة التسعير لتناسب الشريحة.",
    };
    const result = validateScenario3ReconciliationResult(input);
    assert.equal(result.resolution, null);
  });

  await t.test("Reconciliation: Rejects answer with null resolution", () => {
    const input = {
      intent: "answer",
      resolution: null,
      feedback: "تعليق",
    };
    assert.throws(() => validateScenario3ReconciliationResult(input), /Technical Invariant Error/);
  });
});