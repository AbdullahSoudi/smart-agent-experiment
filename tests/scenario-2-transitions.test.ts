import test from "node:test";
import assert from "node:assert/strict";
import { getNextNodeS2 } from "../lib/scenarios/scenario-2";

test("Scenario 2 Deterministic Transitions", async (t) => {
  await t.test("N1: Strong idea routes to N2", () => {
    assert.equal(getNextNodeS2("N1", "advanced"), "N2");
  });

  await t.test("N1: Acceptable idea routes to hint N1_H", () => {
    assert.equal(getNextNodeS2("N1", "medium"), "N1_H");
  });

  await t.test("N1: Weak idea routes to fallback N1_F", () => {
    assert.equal(getNextNodeS2("N1", "weak"), "N1_F");
  });

  await t.test("N1_H: Hint successful retry routes to N2", () => {
    assert.equal(getNextNodeS2("N1_H", "advanced"), "N2");
    assert.equal(getNextNodeS2("N1_H", "medium"), "N2");
  });

  await t.test("N1_H: Hint weak retry routes to N1_F", () => {
    assert.equal(getNextNodeS2("N1_H", "weak"), "N1_F");
  });

  await t.test("N1_F: Fallback rescue always advances to N2", () => {
    assert.equal(getNextNodeS2("N1_F"), "N2");
    assert.equal(getNextNodeS2("N1_F", "weak"), "N2");
  });

  await t.test("N2: Marketing challenge converges forward to N3 across all classifications", () => {
    assert.equal(getNextNodeS2("N2", "advanced"), "N3");
    assert.equal(getNextNodeS2("N2", "medium"), "N3");
    assert.equal(getNextNodeS2("N2", "weak"), "N3");
  });

  await t.test("N2_H: Advances to N3", () => {
    assert.equal(getNextNodeS2("N2_H"), "N3");
  });

  await t.test("N3: Strong or acceptable competitive advantage routes to N4", () => {
    assert.equal(getNextNodeS2("N3", "advanced"), "N4");
    assert.equal(getNextNodeS2("N3", "medium"), "N4");
  });

  await t.test("N3: Weak competitive advantage loops to N2_H per spec", () => {
    assert.equal(getNextNodeS2("N3", "weak"), "N2_H");
  });

  await t.test("N3_H: Advances to N4", () => {
    assert.equal(getNextNodeS2("N3_H"), "N4");
  });

  await t.test("N4: Rebuilt idea unconditionally advances to N5", () => {
    assert.equal(getNextNodeS2("N4", "advanced"), "N5");
    assert.equal(getNextNodeS2("N4", "medium"), "N5");
    assert.equal(getNextNodeS2("N4", "weak"), "N5");
    assert.equal(getNextNodeS2("N4"), "N5");
  });

  await t.test("N4_H: Advances to N5", () => {
    assert.equal(getNextNodeS2("N4_H"), "N5");
  });

  await t.test("N5: Strong or acceptable scalability routes to END", () => {
    assert.equal(getNextNodeS2("N5", "advanced"), "END");
    assert.equal(getNextNodeS2("N5", "medium"), "END");
  });

  await t.test("N5: Weak scalability loops to N4_H", () => {
    assert.equal(getNextNodeS2("N5", "weak"), "N4_H");
  });

  await t.test("N5_H: Advances to END", () => {
    assert.equal(getNextNodeS2("N5_H"), "END");
  });

  await t.test("END: Terminal node returns null", () => {
    assert.equal(getNextNodeS2("END"), null);
  });
});