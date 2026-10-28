import axiosClient from "@/api/axiosClient";
import type {
  ApiSingleResponse,
  JsonValue,
  OmrGridConfig,
  PaginatedResponse,
} from "@/types/academic.types";

interface RawStudentSummary {
  id: string;
  student_code: string | null;
  internal_id?: string | null;
  full_name: string;
  email: string;
}

interface RawExamVersionSummary {
  id: string;
  version_code: string;
}

interface RawExamSummary {
  id: string;
  name: string;
  subject: string;
  total_questions: number;
  identification_mode?: "INTERNAL" | "EXTERNAL";
  class_code?: string | null;
}

interface RawAnswerSheetListItem {
  id: string;
  student_id?: string | null;
  class_code?: string | null;
  exam_code?: string | null;
  submission_mode?: string | null;
  offline_verified?: boolean;
  received_at?: string | null;
  security_flags?: Record<string, unknown> | null;
  total_score: string | number;
  source: string | null;
  sync_status: string | null;
  raw_image_url: string | null;
  dewarped_image_url: string | null;
  processed_image_url: string | null;
  latest_regrade_snapshot?: AppealImageResult | null;
  reviewed_result?: AppealImageResult | null;
  regradeSnapshots?: AppealImageResult[];
  identification_mode?: "INTERNAL" | "EXTERNAL";
  graded_at: string | null;
  created_at: string | null;
  student: RawStudentSummary;
  exam_version: RawExamVersionSummary | null;
  total_questions: number;
  correct_count: number;
  flagged_count: number;
  confidence_avg: number | null;
}

interface RawAnswerDetail {
  id: string;
  question_number: number;
  student_answer: JsonValue;
  correct_answer: JsonValue;
  is_correct: boolean;
  is_flagged: boolean | null;
  score: string | number;
}

interface RawOmrConfidenceDetail {
  id: string;
  question_number: number;
  bubble_scores: JsonValue;
  detected_answer: JsonValue;
  confidence: string | number;
  needs_review: boolean | null;
}

interface RawAnswerSheetDetail extends RawAnswerSheetListItem {
  exam: RawExamSummary;
  template: {
    id: string;
    version: string;
    template_type: string;
    grid_config?: OmrGridConfig | null;
  } | null;
  graded_by: {
    id: string;
    full_name: string;
  } | null;
  answer_details: RawAnswerDetail[];
  omr_confidence_details?: RawOmrConfidenceDetail[];
}

/** Images of one graded sheet (original and re-graded). */
export interface AppealImageResult {
  id?: string;
  sheet_id?: string;
  raw_image_url?: string | null;
  dewarped_image_url?: string | null;
  processed_image_url?: string | null;
  previous_raw_image_url?: string | null;
  previous_dewarped_image_url?: string | null;
  previous_processed_image_url?: string | null;
  detail_endpoint?: string | null;
  created_at?: string | null;
}

export interface AnswerSheetListItem {
  id: string;
  student_id?: string | null;
  class_code?: string | null;
  exam_code?: string | null;
  submission_mode?: string | null;
  offline_verified?: boolean;
  received_at?: string | null;
  security_flags?: Record<string, unknown> | null;
  total_score: number;
  source: string | null;
  sync_status: string | null;
  raw_image_url: string | null;
  dewarped_image_url: string | null;
  processed_image_url: string | null;
  latest_regrade_snapshot?: AppealImageResult | null;
  reviewed_result?: AppealImageResult | null;
  regradeSnapshots?: AppealImageResult[];
  identification_mode?: "INTERNAL" | "EXTERNAL";
  graded_at: string | null;
  created_at: string | null;
  student: RawStudentSummary;
  exam_version: RawExamVersionSummary | null;
  total_questions: number;
  correct_count: number;
  flagged_count: number;
  confidence_avg: number | null;
}

export interface AnswerDetail {
  id: string;
  question_number: number;
  student_answer: JsonValue;
  correct_answer: JsonValue;
  is_correct: boolean;
  is_flagged: boolean;
  score: number;
}

export interface OmrConfidenceDetail {
  id: string;
  question_number: number;
  bubble_scores: JsonValue;
  detected_answer: JsonValue;
  confidence: number;
  needs_review: boolean;
}

export interface AnswerSheetDetail extends AnswerSheetListItem {
  exam: RawExamSummary;
  template: RawAnswerSheetDetail["template"];
  graded_by: RawAnswerSheetDetail["graded_by"];
  answer_details: AnswerDetail[];
  omr_confidence_details: OmrConfidenceDetail[];
}

function toNumber(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function normalizeListItem(raw: RawAnswerSheetListItem): AnswerSheetListItem {
  return {
    ...raw,
    total_score: toNumber(raw.total_score),
    confidence_avg:
      raw.confidence_avg === null ? null : toNumber(raw.confidence_avg),
  };
}

function normalizeDetail(raw: RawAnswerSheetDetail): AnswerSheetDetail {
  return {
    ...normalizeListItem(raw),
    exam: raw.exam,
    template: raw.template,
    graded_by: raw.graded_by,
    answer_details: raw.answer_details.map((detail) => ({
      ...detail,
      is_flagged: Boolean(detail.is_flagged),
      score: toNumber(detail.score),
    })),
    omr_confidence_details: (raw.omr_confidence_details ?? []).map(
      (detail) => ({
        ...detail,
        confidence: toNumber(detail.confidence),
        needs_review: Boolean(detail.needs_review),
      }),
    ),
  };
}

export function formatAnswerValue(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value))
    return value
      .map((item) => formatAnswerValue(item))
      .filter(Boolean)
      .join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function getExamAnswerSheets(
  examId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "all" | "graded" | "error";
  } = {},
): Promise<PaginatedResponse<AnswerSheetListItem>> {
  const { data } = await axiosClient.get<
    PaginatedResponse<RawAnswerSheetListItem>
  >(`/web/exams/${examId}/answer-sheets`, { params });

  return {
    data: data.data.map(normalizeListItem),
    meta: data.meta,
  };
}

export async function getExamAnswerSheet(
  examId: string,
  sheetId: string,
  includeConfidence = true,
): Promise<AnswerSheetDetail> {
  const { data } = await axiosClient.get<
    ApiSingleResponse<RawAnswerSheetDetail>
  >(`/web/exams/${examId}/answer-sheets/${sheetId}`, {
    params: { include_confidence: includeConfidence },
  });

  return normalizeDetail(data.data);
}

export async function retryVisualDebug(
  examId: string,
  sheetId: string,
): Promise<void> {
  await axiosClient.post(
    `/web/exams/${examId}/answer-sheets/${sheetId}/visual-debug`,
  );
}

export async function uploadProcessedImage(
  examId: string,
  sheetId: string,
  image: Blob,
): Promise<{ processed_image_url: string; updated: boolean }> {
  const formData = new FormData();
  formData.append("file", image, `visual-debug-${sheetId}.jpg`);
  const { data } = await axiosClient.post<
    ApiSingleResponse<{ processed_image_url: string; updated: boolean }>
  >(`/web/exams/${examId}/answer-sheets/${sheetId}/processed-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
