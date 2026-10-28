import type { ExamViolation } from "./exams.api";

const VIOLATION_TRANSLATION_KEYS: Record<string, string> = {
  heartbeat_timeout: "exams.violations.types.heartbeat_timeout",
  switch_app: "exams.violations.types.switch_app",
  screen_off: "exams.violations.types.screen_off",
  untrusted: "exams.violations.types.untrusted",
  network_lost: "exams.violations.types.network_lost",
  network_offline: "exams.violations.types.network_offline",
  network_restored: "exams.violations.types.network_restored",
  offline_gap_detected: "exams.violations.types.offline_gap_detected",
};

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getViolationTranslationKey(type: string) {
  return VIOLATION_TRANSLATION_KEYS[type] ?? null;
}

export function getViolationBackendLabel(violation: ExamViolation) {
  return readText(violation.violation_label);
}

export function getViolationTeacherMessage(violation: ExamViolation) {
  const directMessage = readText(violation.teacher_message);
  if (directMessage) return directMessage;

  const evidence = violation.evidence_data;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return null;

  const record = evidence as Record<string, unknown>;
  return readText(record.teacher_message) ?? readText(record.teacherMessage);
}
