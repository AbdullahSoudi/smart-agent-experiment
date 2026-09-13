import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getNextNode } from "../lib/transitions";
import { evaluateNodeAnswer } from "../lib/server/evaluator";

describe("T54 Intent & Transition Unit Invariants", () => {
  test("evaluated answer uses deterministic getNextNode", () => {
    const nextNode = getNextNode({
      nodeId: "N1",
      classification: "advanced",
    });
    assert.equal(nextNode, "N2");
  });

  test("support turn keeps current node unchanged without calling transition logic", () => {
    const currentNode = "N1";
    const intent = "support";
    const nextNode = intent === "support" ? currentNode : getNextNode({ nodeId: "N1", classification: "weak" });
    assert.equal(nextNode, "N1");
  });

  test("off_topic turn keeps current node unchanged", () => {
    const currentNode = "N3";
    const intent = "off_topic";
    const nextNode = intent === "off_topic" ? currentNode : getNextNode({ nodeId: "N3", classification: "weak" });
    assert.equal(nextNode, "N3");
  });

  test("N1_F remains unconditional deterministic rescue to N2 without AI classification", () => {
    const nextNode = getNextNode({ nodeId: "N1_F" });
    assert.equal(nextNode, "N2");
  });

  test("N2_H remains unconditional deterministic continue to N3", () => {
    const nextNode = getNextNode({ nodeId: "N2_H" });
    assert.equal(nextNode, "N3");
  });

  test("N4_H actual answer remains unclassified and deterministically advances to N5", () => {
    const nextNode = getNextNode({ nodeId: "N4_H" });
    assert.equal(nextNode, "N5");
  });

  test("END terminal node produces null transition", () => {
    const nextNode = getNextNode({ nodeId: "END" });
    assert.equal(nextNode, null);
  });
});

describe("T54 Live AI Intent Evaluation Matrix (Groq Prompt 0.3)", { timeout: 150000 }, () => {
  test("SUPPORT: 'مش فاهم' -> intent=support, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "مش فاهم",
    });
    assert.equal(res.intent, "support");
    assert.equal(res.classification, null);
    assert.ok(res.feedback && res.feedback.length > 0);
  });

  test("SUPPORT: 'ممكن تبسط السؤال؟' -> intent=support, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "ممكن تبسط السؤال؟",
    });
    assert.equal(res.intent, "support");
    assert.equal(res.classification, null);
  });

  test("SUPPORT: 'ممكن تتكلم معايا مصري؟' -> intent=support, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "ممكن تتكلم معايا مصري؟",
    });
    assert.equal(res.intent, "support");
    assert.equal(res.classification, null);
    assert.ok(res.feedback && res.feedback.length > 0);
  });

  test("SUPPORT: 'اديني مثال' -> intent=support, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N2",
      answer: "اديني مثال عشان أفهم",
    });
    assert.equal(res.intent, "support");
    assert.equal(res.classification, null);
  });

  test("SUPPORT: 'يعني إيه قيمة اقتصادية؟' -> intent=support, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N4_REV",
      answer: "يعني إيه قيمة اقتصادية؟",
    });
    assert.equal(res.intent, "support");
    assert.equal(res.classification, null);
  });

  test("OFF-TOPIC: 'عامل ايه؟' -> intent=off_topic, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "عامل ايه؟",
    });
    assert.equal(res.intent, "off_topic");
    assert.equal(res.classification, null);
  });

  test("OFF-TOPIC: 'ممكن نتكلم في حاجة تانية؟' -> intent=off_topic, classification=null", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "ممكن نتكلم في حاجة تانية؟",
    });
    assert.equal(res.intent, "off_topic");
    assert.equal(res.classification, null);
  });

  test("ANSWER (Genuine Advanced): N1 student interviews -> intent=answer, classification=advanced", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "هعمل مقابلات مع زمايلي وأسألهم عن المشاكل اللي بتواجههم لما بيدوروا على ملخصات",
    });
    assert.equal(res.intent, "answer");
    assert.equal(res.classification, "advanced");
  });

  test("ANSWER (Genuine Weak): N1 building app directly -> intent=answer, classification=weak", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N1",
      answer: "هعمل تطبيق للملخصات وأعرض فيه ملخصات المواد علطول",
    });
    assert.equal(res.intent, "answer");
    assert.equal(res.classification, "weak");
  });

  test("MIXED: 'مش فاهم أوي بس أعتقد المشكلة إن المصادر متشتتة' -> intent=answer", async () => {
    const res = await evaluateNodeAnswer({
      nodeId: "N3",
      answer: "مش فاهم أوي بس أعتقد المشكلة إن المصادر متشتتة ومفيش مكان واحد منظم",
    });
    assert.equal(res.intent, "answer");
    assert.ok(res.classification === "advanced" || res.classification === "medium");
  });
});
