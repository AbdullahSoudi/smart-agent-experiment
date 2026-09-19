/**
 * Shared validation constants and utilities for student input.
 *
 * Engineering reliability parameter — NOT a pedagogical rubric, word-count assignment,
 * or grading constraint.
 */
export const MAX_STUDENT_ANSWER_LENGTH = 1000;

export const ANSWER_TOO_LONG_ERROR =
  "الإجابة طويلة جدًا. اختصرها قليلاً ثم حاول مرة أخرى.";

export const MAX_STUDENT_NAME_LENGTH = 100;

/**
 * Minimal safe normalization for student names:
 * - Trims leading and trailing whitespace
 * - Collapses repeated whitespace sequences to a single space
 */
export function normalizeStudentName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Validates student name according to research constraints:
 * - Must be non-empty string
 * - Reasonable maximum length (<= 100 chars)
 * - Supports Arabic names naturally
 */
export function validateStudentName(name: unknown): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  if (typeof name !== "string") {
    return { valid: false, error: "يرجى إدخال اسمك للمتابعة." };
  }
  const normalized = normalizeStudentName(name);
  if (!normalized) {
    return { valid: false, error: "يرجى إدخال اسمك للمتابعة." };
  }
  if (normalized.length > MAX_STUDENT_NAME_LENGTH) {
    return { valid: false, error: "الاسم طويل جدًا، يرجى كتابة اسم مختصر." };
  }
  return { valid: true, normalized };
}