import axiosClient from "@/api/axiosClient";
import { resolveServerFileUrl } from "@/lib/resolveServerFileUrl";
import type {
  ApiSingleResponse,
  CreateExamAssignmentPayload,
  CreateExamPayload,
  Exam,
  ExamAssignment,
  ExamVersion,
  ExportAllExamResponse,
  GenerateExamQuestionsPayload,
  GenerateExamVersionsPayload,
  GenerateVersionsFromBankPayload,
  ExamStatus,
  ExamType,
  AnswerKeyValue,
  GradingType,
  IdentificationMode,
  JsonValue,
  OnlineConfigDTO,
  PaginatedResponse,
  ShuffleMode,
  Template,
  UpdateExamPayload,
} from "@/types/academic.types";

type BackendExamStatus = "DRAFT" | "READY" | "SCHEDULED" | "ACTIVE" | "END" | "CLOSED";
type BackendExamType = "PAPER" | "ONLINE" | "HYBRID";
type BackendGradingType = "TEACHER_GRADING" | "STUDENT_SUBMISSION";
type BackendShuffleMode = "NONE" | "QUESTIONS" | "CHOICES" | "BOTH";
type BackendIdentificationMode = "INTERNAL" | "EXTERNAL";

interface RawExam {
  id: string;
  name: string;
  subject: string;
  duration: number;
  totalQuestions?: number;
  total_questions?: number;
  scoreScale?: number | string;
  score_scale?: number | string;
  status: BackendExamStatus | ExamStatus;
  examType?: BackendExamType | ExamType;
  exam_type?: BackendExamType | ExamType;
  gradingType?: BackendGradingType | GradingType;
  grading_type?: BackendGradingType | GradingType;
  activeSessionCount?: number;
  active_session_count?: number;
  overdueSessionCount?: number;
  overdue_session_count?: number;
  startTime?: string | null;
  start_time?: string | null;
  endTime?: string | null;
  end_time?: string | null;
  identificationMode?: BackendIdentificationMode | IdentificationMode;
  identification_mode?: BackendIdentificationMode | IdentificationMode;
  templateId?: string | null;
  template_id?: string | null;
  template?: RawTemplate | null;
  onlineConfig?: JsonValue | null;
  online_config?: JsonValue | null;
  createdById?: string | null;
  created_by?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  parentExamId?: string | null;
  parent_exam_id?: string | null;
  classId?: string | null;
  class_id?: string | null;
  class?: {
    id: string;
    className?: string;
    class_name?: string;
    classCode?: string | null;
    class_code?: string | null;
  } | null;
  instances?: RawExam[];
  _count?: Exam["_count"];
}

interface RawTemplate {
  id: string;
  name: string;
  version: string;
  baseImageUrl?: string | null;
  base_image_url?: string | null;
  previewImageUrl?: string | null;
  preview_image_url?: string | null;
  anchorPoints?: Template["anchor_points"];
  anchor_points?: Template["anchor_points"];
  gridConfig?: Template["grid_config"];
  grid_config?: Template["grid_config"];
  templateType?: string;
  template_type?: string;
  status?: string;
  createdById?: string | null;
  created_by?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

interface RawExamAssignment {
  id: string;
  examId?: string;
  exam_id?: string;
  classId?: string;
  class_id?: string;
  class?: {
    id: string;
    className?: string;
    class_name?: string;
    classCode?: string | null;
    class_code?: string | null;
    joinCode?: string | null;
    join_code?: string | null;
    grade?: string | null;
    schoolYear?: string | null;
    school_year?: string | null;
  } | null;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

interface RawOnlineConfig {
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  isLockedMode?: boolean;
  is_locked_mode?: boolean;
  maxAttempts?: number;
  max_attempts?: number;
  lockConfig?: Record<string, JsonValue>;
  lock_config?: Record<string, JsonValue>;
}

interface RawExamVersion {
  id: string;
  examId?: string;
  exam_id?: string;
  versionCode?: string;
  version_code?: string;
  answerKey?: Record<string, unknown> | null;
  answer_key?: Record<string, unknown> | null;
  questionOrder?: string[] | null;
  question_order?: string[] | null;
  choicePermutation?: Record<string, number[]> | null;
  choice_permutation?: Record<string, number[]> | null;
  shuffleMode?: BackendShuffleMode | ShuffleMode;
  shuffle_mode?: BackendShuffleMode | ShuffleMode;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

interface GenerateVersionsResponse {
  created: RawExamVersion[];
  count: number;
  warnings?: string[];
}

interface CreateAssignmentsResponse {
  created: RawExamAssignment[];
  skipped: number;
}

export interface ExamViolation {
  id: string;
  session_id: string;
  violation_type: string;
  violation_label?: string | null;
  teacher_message?: string | null;
  occurred_at: string | null;
  created_at: string | null;
  evidence_data: JsonValue | null;
  session_status: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    code: string | null;
  };
  class: {
    name: string;
    code: string | null;
  } | null;
  exam: {
    id: string;
    name: string;
  };
}

export type ExamParticipantStatus = "not_started" | "in_progress" | "submitted" | "violated" | "timeout" | "graded" | "ungraded";

export interface ExamParticipant {
  student: {
    id: string;
    name: string;
    email: string;
    internal_id: string | null;
    student_code: string | null;
  };
  class: {
    id: string;
    name: string;
    code: string | null;
  };
  status: ExamParticipantStatus;
  session: {
    id: string;
    status: string | null;
    attempt_no: number | null;
    start_time: string | null;
    end_time: string | null;
    last_active: string | null;
    violation_count: number;
  } | null;
  submission: {
    id: string;
    status: string | null;
    submitted_at: string | null;
    sheet_id: string | null;
    total_score: number | null;
    graded_at: string | null;
    has_debug_image: boolean;
  } | null;
}

export interface ExamParticipantsResponse {
  data: ExamParticipant[];
  grading_type: GradingType;
  summary: Record<ExamParticipantStatus | "total", number>;
  meta: { page: number; limit: number; total: number };
}

export interface ExamQueryParams {
  status?: ExamStatus;
  name?: string;
  subject?: string;
  excludeClosed?: boolean;
  page?: number;
  limit?: number;
}

function normalizeDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeStatus(status: BackendExamStatus | ExamStatus | undefined): ExamStatus {
  return String(status ?? "DRAFT").toLowerCase() as ExamStatus;
}

function normalizeExamType(examType: BackendExamType | ExamType | undefined): ExamType {
  return String(examType ?? "PAPER").toLowerCase() as ExamType;
}

function normalizeGradingType(gradingType: BackendGradingType | GradingType | undefined): GradingType {
  return (gradingType ?? "TEACHER_GRADING") as GradingType;
}

function normalizeShuffleMode(shuffleMode: BackendShuffleMode | ShuffleMode | undefined): ShuffleMode {
  return String(shuffleMode ?? "NONE").toLowerCase() as ShuffleMode;
}

function normalizeIdentificationMode(
  identificationMode: BackendIdentificationMode | IdentificationMode | undefined,
): IdentificationMode {
  return String(identificationMode ?? "INTERNAL").toLowerCase() as IdentificationMode;
}

function normalizeTemplate(raw: RawTemplate): Template {
  return {
    id: raw.id,
    name: raw.name,
    version: raw.version,
    base_image_url: raw.base_image_url ?? raw.baseImageUrl ?? null,
    preview_image_url: raw.preview_image_url ?? raw.previewImageUrl ?? null,
    anchor_points: raw.anchor_points ?? raw.anchorPoints ?? [],
    grid_config: raw.grid_config ?? raw.gridConfig ?? { answer_zones: [] },
    template_type: String(raw.template_type ?? raw.templateType ?? "STANDARD").toLowerCase() as Template["template_type"],
    status: String(raw.status ?? "PUBLISHED").toLowerCase() as Template["status"],
    created_by: raw.created_by ?? raw.createdById ?? null,
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
  };
}

function normalizeAnswerKeyValue(value: unknown): AnswerKeyValue | null {
  const rawValues = Array.isArray(value) ? value : [value];
  const answers = rawValues
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  if (answers.length === 0) return null;
  return answers.length === 1 ? answers[0] : answers;
}

function normalizeAnswerKey(raw: Record<string, unknown> | null | undefined): Record<string, AnswerKeyValue> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return Object.entries(raw).reduce<Record<string, AnswerKeyValue>>((acc, [key, value]) => {
    const questionNumber = Number.parseInt(key, 10);
    if (!Number.isInteger(questionNumber) || questionNumber <= 0) return acc;

    const answer = normalizeAnswerKeyValue(value);
    if (answer) {
      acc[String(questionNumber)] = answer;
    }
    return acc;
  }, {});
}

function toBackendStatus(status?: ExamStatus): BackendExamStatus | undefined {
  return status ? (status.toUpperCase() as BackendExamStatus) : undefined;
}

function toBackendExamType(examType?: ExamType): BackendExamType | undefined {
  return examType ? (examType.toUpperCase() as BackendExamType) : undefined;
}

function toBackendShuffleMode(shuffleMode?: ShuffleMode): BackendShuffleMode | undefined {
  return shuffleMode ? (shuffleMode.toUpperCase() as BackendShuffleMode) : undefined;
}

function toBackendIdentificationMode(identificationMode?: IdentificationMode): BackendIdentificationMode | undefined {
  return identificationMode ? (identificationMode.toUpperCase() as BackendIdentificationMode) : undefined;
}

function normalizeExam(raw: RawExam): Exam {
  return {
    id: raw.id,
    name: raw.name,
    subject: raw.subject,
    duration: raw.duration,
    total_questions: raw.total_questions ?? raw.totalQuestions ?? 0,
    score_scale: Number(raw.score_scale ?? raw.scoreScale ?? 10),
    template_id: raw.template_id ?? raw.templateId ?? raw.template?.id ?? null,
    template: raw.template ? normalizeTemplate(raw.template) : null,
    status: normalizeStatus(raw.status),
    exam_type: normalizeExamType(raw.exam_type ?? raw.examType),
    grading_type: normalizeGradingType(raw.grading_type ?? raw.gradingType),
    active_session_count: raw.active_session_count ?? raw.activeSessionCount ?? 0,
    overdue_session_count: raw.overdue_session_count ?? raw.overdueSessionCount ?? 0,
    start_time: normalizeDate(raw.start_time ?? raw.startTime),
    end_time: normalizeDate(raw.end_time ?? raw.endTime),
    identification_mode: normalizeIdentificationMode(raw.identification_mode ?? raw.identificationMode),
    online_config: raw.online_config ?? raw.onlineConfig ?? null,
    created_by: raw.created_by ?? raw.createdById ?? null,
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
    parent_exam_id: raw.parent_exam_id ?? raw.parentExamId ?? null,
    class_id: raw.class_id ?? raw.classId ?? raw.class?.id ?? null,
    class: raw.class
      ? {
          id: raw.class.id,
          class_name: raw.class.class_name ?? raw.class.className ?? "",
          class_code: raw.class.class_code ?? raw.class.classCode ?? null,
        }
      : null,
    instances: raw.instances?.map(normalizeExam) ?? [],
    _count: raw._count,
  };
}

function normalizeAssignment(raw: RawExamAssignment): ExamAssignment {
  return {
    id: raw.id,
    exam_id: raw.exam_id ?? raw.examId ?? "",
    class_id: raw.class_id ?? raw.classId ?? "",
    class: raw.class
      ? {
          id: raw.class.id,
          class_name: raw.class.class_name ?? raw.class.className ?? "",
          class_code: raw.class.class_code ?? raw.class.classCode ?? null,
          join_code: raw.class.join_code ?? raw.class.joinCode ?? null,
          grade: raw.class.grade ?? null,
          school_year: raw.class.school_year ?? raw.class.schoolYear ?? null,
        }
      : null,
    start_time: normalizeDate(raw.start_time ?? raw.startTime) ?? "",
    end_time: normalizeDate(raw.end_time ?? raw.endTime) ?? "",
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
  };
}

function normalizeExamVersion(raw: RawExamVersion): ExamVersion {
  return {
    id: raw.id,
    exam_id: raw.exam_id ?? raw.examId ?? "",
    version_code: raw.version_code ?? raw.versionCode ?? "",
    answer_key: normalizeAnswerKey(raw.answer_key ?? raw.answerKey),
    question_order: raw.question_order ?? raw.questionOrder ?? null,
    choice_permutation: raw.choice_permutation ?? raw.choicePermutation ?? null,
    shuffle_mode: normalizeShuffleMode(raw.shuffle_mode ?? raw.shuffleMode),
    created_at: normalizeDate(raw.created_at ?? raw.createdAt),
    updated_at: normalizeDate(raw.updated_at ?? raw.updatedAt),
  };
}

function normalizeOnlineConfig(raw: RawOnlineConfig): OnlineConfigDTO {
  return {
    start_time: normalizeDate(raw.start_time ?? raw.startTime) ?? "",
    end_time: normalizeDate(raw.end_time ?? raw.endTime) ?? "",
    is_locked_mode: raw.is_locked_mode ?? raw.isLockedMode ?? true,
    max_attempts: raw.max_attempts ?? raw.maxAttempts ?? 3,
    lock_config: raw.lock_config ?? raw.lockConfig ?? {},
  };
}

function toBackendExamPayload(payload: CreateExamPayload | UpdateExamPayload) {
  return {
    name: payload.name,
    subject: payload.subject,
    duration_minutes: payload.duration,
    total_questions: payload.total_questions,
    score_scale: payload.score_scale,
    template_id: payload.template_id,
    answer_key: payload.answer_key,
    class_id: payload.class_id,
    class_ids: payload.class_ids,
    identification_mode: toBackendIdentificationMode(payload.identification_mode),
    exam_type: toBackendExamType(payload.exam_type),
    grading_type: payload.grading_type,
    start_time: payload.start_time,
    end_time: payload.end_time,
  };
}

function toBackendUpdateExamPayload(payload: UpdateExamPayload) {
  const { class_id: _classId, class_ids: _classIds, ...examPayload } = toBackendExamPayload(payload);
  return examPayload;
}

export async function getExams(params: ExamQueryParams = {}): Promise<PaginatedResponse<Exam>> {
  const { data } = await axiosClient.get<PaginatedResponse<RawExam>>("/web/exams", {
    params: {
      status: toBackendStatus(params.status),
      name: params.name,
      subject: params.subject,
      exclude_closed: params.excludeClosed,
      page: params.page,
      limit: params.limit,
    },
  });

  return {
    data: data.data.map(normalizeExam),
    meta: data.meta,
  };
}

export async function getExam(examId: string): Promise<Exam> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawExam>>(`/web/exams/${examId}`);
  return normalizeExam(data.data);
}

export async function getExamViolations(examId: string, params: { page?: number; limit?: number } = {}) {
  const { data } = await axiosClient.get<{ data: ExamViolation[]; meta: { page: number; limit: number; total: number } }>(`/web/exams/${examId}/violations`, { params });
  return data;
}

export async function getExamParticipants(examId: string, params: { page?: number; limit?: number; status?: "all" | "not_started" | "in_progress" | "submitted" | "attention" | "graded" | "ungraded" } = {}): Promise<ExamParticipantsResponse> {
  const { data } = await axiosClient.get<ExamParticipantsResponse>(`/web/exams/${examId}/participants`, { params });
  return data;
}

export async function createExam(payload: CreateExamPayload): Promise<Exam> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawExam>>(
    "/web/exams",
    toBackendExamPayload(payload),
  );
  return normalizeExam(data.data);
}

export async function updateExam(examId: string, payload: UpdateExamPayload): Promise<Exam> {
  const { data } = await axiosClient.put<ApiSingleResponse<RawExam>>(
    `/web/exams/${examId}`,
    toBackendUpdateExamPayload(payload),
  );
  return normalizeExam(data.data);
}

export async function deleteExam(examId: string): Promise<void> {
  await axiosClient.delete(`/web/exams/${examId}`);
}

export async function publishExam(examId: string): Promise<Exam> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawExam>>(`/web/exams/${examId}/publish`);
  return normalizeExam(data.data);
}

export async function closeExam(examId: string): Promise<Exam> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawExam>>(`/web/exams/${examId}/close`);
  return normalizeExam(data.data);
}

export async function generateExamVersions(
  examId: string,
  payload: GenerateExamVersionsPayload,
): Promise<{ created: ExamVersion[]; count: number }> {
  const { data } = await axiosClient.post<ApiSingleResponse<GenerateVersionsResponse>>(
    `/web/exams/${examId}/versions/generate`,
    {
      count: payload.count,
      shuffle_mode: toBackendShuffleMode(payload.shuffle_mode),
      reset_versions: payload.reset_versions,
    },
  );

  return {
    created: data.data.created.map(normalizeExamVersion),
    count: data.data.count,
  };
}

export async function generateExamQuestions(
  examId: string,
  payload: GenerateExamQuestionsPayload,
): Promise<{ created: number }> {
  const { data } = await axiosClient.post<ApiSingleResponse<{ created: number }>>(
    `/web/exams/${examId}/generate-questions`,
    payload,
  );
  return data.data;
}

export async function generateExamVersionsFromBank(
  examId: string,
  payload: GenerateVersionsFromBankPayload,
): Promise<{ created: ExamVersion[]; count: number; warnings: string[] }> {
  const requestConfig = { timeout: 0 };
  console.info("[exams.api] generateExamVersionsFromBank", {
    examId,
    timeout: requestConfig.timeout,
  });
  const { data } = await axiosClient.post<ApiSingleResponse<GenerateVersionsResponse>>(
    `/web/exams/${examId}/generate-versions-from-bank`,
    {
      ...payload,
      shuffleMode: toBackendShuffleMode(payload.shuffleMode),
    },
    requestConfig,
  );

  return {
    created: data.data.created.map(normalizeExamVersion),
    count: data.data.count,
    warnings: data.data.warnings ?? [],
  };
}

export async function saveAnswerKeysByVersion(
  examId: string,
  payload: { versions: Array<{ versionCode: string; answerKey: Record<string, AnswerKeyValue> }> },
): Promise<{ created: ExamVersion[]; count: number }> {
  const { data } = await axiosClient.post<ApiSingleResponse<GenerateVersionsResponse>>(
    `/web/exams/${examId}/answer-keys-by-version`,
    payload,
  );

  return {
    created: data.data.created.map(normalizeExamVersion),
    count: data.data.count,
  };
}

export async function importAnswerKeys(
  examId: string,
  file: File,
): Promise<{ created: ExamVersion[]; count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axiosClient.post<ApiSingleResponse<GenerateVersionsResponse>>(
    `/web/exams/${examId}/import-answer-keys`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return {
    created: data.data.created.map(normalizeExamVersion),
    count: data.data.count,
  };
}

export async function getExamVersions(examId: string): Promise<ExamVersion[]> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawExamVersion[]>>(
    `/web/exams/${examId}/versions`,
  );
  return data.data.map(normalizeExamVersion);
}

export async function getExamVersion(examId: string, versionId: string): Promise<ExamVersion> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawExamVersion>>(
    `/web/exams/${examId}/versions/${versionId}`,
  );
  return normalizeExamVersion(data.data);
}

export async function deleteExamVersion(examId: string, versionId: string): Promise<void> {
  await axiosClient.delete(`/web/exams/${examId}/versions/${versionId}`);
}

export async function deleteAllExamVersions(examId: string): Promise<void> {
  await axiosClient.delete(`/web/exams/${examId}/versions`);
}

export async function exportExamVersions(examId: string, language?: string): Promise<Blob> {
  const { data } = await axiosClient.get(`/web/exams/${examId}/exports/versions`, {
    params: language ? { language } : undefined,
    responseType: "blob",
  });
  return data;
}

export async function exportAllExamPdfs(examId: string, language?: string): Promise<ExportAllExamResponse> {
  const { data } = await axiosClient.request<ApiSingleResponse<ExportAllExamResponse>>({
    method: "post",
    url: `/web/exams/${examId}/export-all`,
    params: language ? { language } : undefined,
  });
  return {
    ...data.data,
    download_url: resolveServerFileUrl(data.data.download_url),
  };
}

export async function createExamAssignments(
  examId: string,
  payload: CreateExamAssignmentPayload,
): Promise<{ created: ExamAssignment[]; skipped: number }> {
  const { data } = await axiosClient.post<ApiSingleResponse<CreateAssignmentsResponse>>(
    `/web/exams/${examId}/assignments`,
    payload,
  );

  return {
    created: data.data.created.map(normalizeAssignment),
    skipped: data.data.skipped,
  };
}

export async function getExamAssignments(examId: string): Promise<ExamAssignment[]> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawExamAssignment[]>>(
    `/web/exams/${examId}/assignments`,
  );
  return data.data.map(normalizeAssignment);
}

export async function getOnlineConfig(examId: string): Promise<OnlineConfigDTO> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawOnlineConfig>>(
    `/web/exams/${examId}/online-config`,
  );
  return normalizeOnlineConfig(data.data);
}

export async function updateOnlineConfig(examId: string, payload: OnlineConfigDTO) {
  const { data } = await axiosClient.put(`/web/exams/${examId}/online-config`, payload);
  return data.data;
}

export async function updateExamStatus(
  examId: string,
  status: "SCHEDULED" | "ACTIVE" | "END" | "CLOSED",
): Promise<Exam> {
  const { data } = await axiosClient.patch<ApiSingleResponse<RawExam>>(
    `/web/exams/${examId}/status`,
    { status },
  );
  return normalizeExam(data.data);
}
