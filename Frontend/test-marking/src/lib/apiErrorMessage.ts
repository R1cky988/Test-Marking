import axios from "axios";
import i18n from "@/i18n";
import type { ApiErrorBody, ApiErrorDetail } from "@/types/auth.types";

type SupportedLanguage = "en" | "vi";

const TECHNICAL_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  DRAFT: { vi: "đang tạo", en: "draft" },
  READY: { vi: "sẵn sàng", en: "ready" },
  SCHEDULED: { vi: "đã lên lịch", en: "scheduled" },
  ACTIVE: { vi: "đang diễn ra", en: "active" },
  END: { vi: "đã hết giờ làm bài", en: "ended" },
  CLOSED: { vi: "đã đóng", en: "closed" },
  TEACHER_GRADING: { vi: "giáo viên chấm bài", en: "teacher grading" },
  STUDENT_SUBMISSION: { vi: "học sinh làm bài trực tuyến", en: "student submission" },
  PAPER: { vi: "thi trên giấy", en: "paper exam" },
  ONLINE: { vi: "thi trực tuyến", en: "online exam" },
  MANUAL: { vi: "nhập thủ công", en: "manual" },
  PENDING: { vi: "đang chờ xử lý", en: "pending" },
  PUBLISHED: { vi: "đã xuất bản", en: "published" },
  ARCHIVED: { vi: "đã lưu trữ", en: "archived" },
  ACCEPTED: { vi: "đã chấp nhận", en: "accepted" },
  REJECTED: { vi: "đã từ chối", en: "rejected" },
  APPROVED: { vi: "đã duyệt", en: "approved" },
  FAILED: { vi: "thất bại", en: "failed" },
  ERROR: { vi: "có lỗi", en: "error" },
  MISSING_STUDENT: { vi: "chưa xác định được học sinh", en: "missing student" },
  MISSING_ANSWERS: { vi: "chưa có dữ liệu đáp án", en: "missing answers" },
  NOT_GRADED: { vi: "chưa chấm", en: "not graded" },
  LOW_CONFIDENCE: { vi: "cần kiểm tra lại", en: "low confidence" },
};

const API_ERROR_I18N_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_INACTIVE",
  "INVALID_GOOGLE_TOKEN",
  "GOOGLE_ACCOUNT_NOT_REGISTERED",
  "GOOGLE_ACCOUNT_WRONG_ROLE",
  "GOOGLE_ACCOUNT_MISMATCH",
  "GOOGLE_ACCOUNT_NOT_LINKED",
  "GOOGLE_ACCOUNT_ALREADY_LINKED",
  "INVALID_REFRESH_TOKEN",
  "TOKEN_REUSE_DETECTED",
  "REFRESH_TOKEN_EXPIRED",
  "EMAIL_EXISTS",
  "PASSWORD_REQUIRED",
  "OTP_RATE_LIMIT",
  "INVALID_OTP",
  "INVALID_REQUEST",
  "INVALID_PASSWORD",
  "USER_NOT_FOUND",
  "AVATAR_REQUIRED",
  "INVALID_FILE_TYPE",
  "PASSWORD_REQUIRED_BEFORE_UNLINK",
  "GOOGLE_TOKEN_REQUIRED",
  "GOOGLE_EMAIL_MISMATCH",
  "SESSION_NOT_FOUND",
  "EXAM_NOT_FOUND",
  "EXAM_FORBIDDEN",
  "EXAM_HAS_SUBMISSIONS",
  "EXAM_TEMPLATE_NOT_ASSIGNED",
  "EXAM_NOT_ACTIVE",
  "TEMPLATE_NOT_FOUND",
  "TEMPLATE_INVALID_CONFIG",
  "TEMPLATE_ANSWER_ZONE_MISSING",
  "TEMPLATE_ANSWER_LAYOUT_MISSING",
  "TEMPLATE_REQUIRED",
  "VERSION_REQUIRED",
  "INVALID_TRANSITION",
  "QUESTION_BANK_NOT_FOUND",
  "QUESTION_BANK_FORBIDDEN",
  "QUESTION_NOT_FOUND",
  "QUESTION_IN_USE",
  "APPEAL_ALREADY_RESOLVED",
  "APPEAL_NOT_FOUND",
  "INVALID_NEW_SCORE",
  "REGRADE_NOT_OPEN",
  "REGRADE_APPEAL_MISMATCH",
  "REGRADE_IDENTITY_MISMATCH",
  "ANSWER_SHEET_NOT_FOUND",
  "SUBMISSION_NOT_FOUND",
  "SUBMISSION_ALREADY_GRADED",
  "ALREADY_GRADED",
  "ALREADY_REJECTED",
  "STUDENT_NOT_FOUND",
  "STUDENT_CODE_MISMATCH",
  "INTERNAL_ID_MISMATCH",
  "CLASS_INACTIVE",
  "CLASS_LOCKED",
  "ALREADY_MEMBER",
  "INVALID_STUDENT_CODE",
  "STUDENT_CODE_EXISTS_IN_CLASS",
  "INTERNAL_ID_EXHAUSTED",
  "DEVICE_ID_REQUIRED",
  "MOBILE_SESSION_NOT_FOUND",
  "SUBMISSION_DEVICE_MISMATCH",
  "CLIENT_SUBMISSION_ID_CONFLICT",
  "SUBMISSION_DEADLINE_EXCEEDED",
  "SUBMISSION_PAYLOAD_HASH_MISMATCH",
  "CLIENT_SUBMISSION_ID_REQUIRED",
  "SUBMISSION_IMAGES_REQUIRED",
  "INVALID_SESSION_STATUS",
  "EXAM_CODE_REQUIRED",
  "EXAM_CODE_NOT_FOUND",
  "SESSION_ALREADY_FINALIZED",
  "OFFLINE_CAPTURE_AFTER_DEADLINE",
  "OFFLINE_CAPTURE_BEFORE_SESSION",
  "INVALID_OFFLINE_PERMIT",
  "OFFLINE_PERMIT_MISMATCH",
  "LOCAL_UPLOAD_INVALID_TOKEN",
  "LOCAL_UPLOAD_SIZE_MISMATCH",
  "LOCAL_UPLOAD_INVALID_PATH",
  "STORAGE_ERROR",
]);

const MESSAGE_REPLACEMENTS: Array<[RegExp, Record<SupportedLanguage, string>]> = [
  [
    /Đáp án thay đổi khi kì thi đã active\/closed\. Gửi lại request với confirm_regrade=true để tạo job chấm lại\./i,
    {
      vi: "Đáp án đã thay đổi khi kỳ thi đang diễn ra hoặc đã kết thúc. Vui lòng xác nhận để hệ thống tạo tiến trình chấm lại.",
      en: "The answer key changed while the exam is active or closed. Please confirm so the system can create a regrading job.",
    },
  ],
  [
    /Gửi lại request với confirm_regrade=true để tạo job chấm lại\./i,
    {
      vi: "Vui lòng xác nhận để hệ thống tạo tiến trình chấm lại.",
      en: "Please confirm so the system can create a regrading job.",
    },
  ],
];

function currentLanguage(): SupportedLanguage {
  return i18n.language?.toLowerCase().startsWith("en") ? "en" : "vi";
}

function normalizeErrorCode(code?: string): string {
  return String(code ?? "").trim().toUpperCase();
}

function translateApiErrorCode(code?: string): string | null {
  const normalizedCode = normalizeErrorCode(code);
  if (!normalizedCode || !API_ERROR_I18N_CODES.has(normalizedCode)) return null;

  const key = `errors.api.${normalizedCode}`;
  const translated = i18n.t(key);
  return translated === key ? null : translated;
}

export function formatTechnicalValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const labels = TECHNICAL_LABELS[raw] ?? TECHNICAL_LABELS[raw.toUpperCase()];
  return labels?.[currentLanguage()] ?? raw;
}

export function formatUserFacingMessage(message: string): string {
  const language = currentLanguage();
  const replacedMessage = MESSAGE_REPLACEMENTS.reduce((current, [pattern, replacement]) => {
    return current.replace(pattern, replacement[language]);
  }, message);

  return Object.entries(TECHNICAL_LABELS).reduce((current, [technical, labels]) => {
    return current.replace(new RegExp(`\\b${technical}\\b`, "g"), labels[language]);
  }, replacedMessage);
}

export function resolveApiErrorMessage(errorBody: ApiErrorBody["error"] | undefined, fallbackMessage: string): string {
  const translatedByCode = translateApiErrorCode(errorBody?.code);
  if (translatedByCode) return translatedByCode;

  return formatUserFacingMessage(errorBody?.message || fallbackMessage);
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!axios.isAxiosError(error)) return fallbackMessage;

  const data = error.response?.data as ApiErrorBody | undefined;
  return resolveApiErrorMessage(data?.error, fallbackMessage);
}

export function getApiErrorDetails(error: unknown): ApiErrorDetail[] {
  if (!axios.isAxiosError(error)) return [];

  const data = error.response?.data as ApiErrorBody | undefined;
  return (data?.error?.details ?? []).map((detail): ApiErrorDetail => {
    if (typeof detail === "string") return formatUserFacingMessage(detail);

    return {
      ...detail,
      message: formatUserFacingMessage(detail.message),
    };
  });
}
