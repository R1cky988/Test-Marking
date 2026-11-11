import axiosClient from "@/api/axiosClient";
import type { ApiSingleResponse, PaginatedResponse } from "@/types/academic.types";

// Exams on the Spring backend: /exams. Three formats:
//   OFFLINE  – paper exam, the teacher marks and publishes the result later
//   ONLINE   – done on the phone; the result may be shown at once (default yes)
//   SUBMIT   – the student photographs the paper and uploads it; never shows the result at once

export type ExamFormat = "OFFLINE" | "ONLINE" | "SUBMIT";
export type ExamStatus = "DRAFT" | "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
export type ExamRole = "TEACHER" | "STUDENT";
export type ResultPolicy = "IMMEDIATE" | "AFTER_TEACHER_PUBLISH";

export const MAX_VERSIONS = 20;
export const EXAM_FORMATS: ExamFormat[] = ["OFFLINE", "ONLINE", "SUBMIT"];
/** OFFLINE and SUBMIT use a printed answer sheet, so they need a template. */
export const formatNeedsTemplate = (f: ExamFormat) => f !== "ONLINE";

export interface Exam {
  id: string;
  name: string;
  subject: string | null;
  class_id: string;
  class_name: string | null;
  format: ExamFormat;
  status: ExamStatus;
  from_time: string | null;
  to_time: string | null;
  duration_minutes: number | null;
  max_score: number | null;
  template_id: string | null;
  template_name: string | null;
  template_total_questions: number | null;
  question_bank_id: string | null;
  question_bank_name: string | null;
  versions_count: number;
  easy: number;
  medium: number;
  hard: number;
  questions_per_version: number;
  show_result_immediately: boolean;
  /** ONLINE: the student may look things up, so leaving the exam screen is not a violation */
  allow_reference: boolean;
  /** ONLINE, closed book: FLAG = leaving the screen is a violation, LOCK = the exam locks until the teacher unlocks it */
  leave_policy: LeavePolicy;
  result_policy: ResultPolicy;
  is_score_published: boolean;
  /** the students may see the results: published by the teacher, or ONLINE with immediate result */
  results_released: boolean;
  my_role: ExamRole;
  created_at: string | null;
}

export type LeavePolicy = "FLAG" | "LOCK";

export interface ExamPayload {
  name: string;
  subject?: string;
  class_id: string;
  format: ExamFormat;
  from_time?: string | null;
  to_time?: string | null;
  duration_minutes?: number | null;
  max_score?: number | null;
  template_id?: string | null;
  question_bank_id?: string | null;
  show_result_immediately?: boolean;
  allow_reference?: boolean;
  leave_policy?: LeavePolicy;
}

export interface ExamVersion {
  id: string;
  code: string;
  question_count: number;
  easy: number;
  medium: number;
  hard: number;
}

export interface VersionQuestion {
  order: number;
  question_id: string;
  content: string;
  question_type: "SINGLE" | "MULTIPLE";
  difficulty: string;
  options: Array<{ label: string; content: string; is_correct?: boolean }>;
  correct_answers: string[];
}

export interface ExamVersionDetail {
  id: string;
  code: string;
  questions: VersionQuestion[];
}

export interface ExamPrint {
  /** the answer sheet of the exam: its name and "mã phiếu" (null when the exam has none) */
  template_name?: string | null;
  sheet_code?: string | null;
  exam_id: string;
  exam_name: string;
  versions: ExamVersionDetail[];
}

export interface GenerateVersionsPayload {
  count: number;
  easy: number;
  medium: number;
  hard: number;
}

export interface ExamListParams {
  page?: number;
  limit?: number;
  search?: string;
  format?: ExamFormat | "";
  class_id?: string;
  /** "student": the exams of the classes I study in */
  role?: "student";
}

export async function listExams(params: ExamListParams = {}): Promise<PaginatedResponse<Exam>> {
  const { data } = await axiosClient.get<PaginatedResponse<Exam>>("/exams", {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search?.trim() || undefined,
      format: params.format || undefined,
      class_id: params.class_id || undefined,
      role: params.role,
    },
  });
  return data;
}

export async function getExam(examId: string): Promise<Exam> {
  const { data } = await axiosClient.get<ApiSingleResponse<Exam>>(`/exams/${examId}`);
  return data.data;
}

export async function createExam(payload: ExamPayload): Promise<Exam> {
  const { data } = await axiosClient.post<ApiSingleResponse<Exam>>("/exams", payload);
  return data.data;
}

export async function updateExam(examId: string, payload: ExamPayload): Promise<Exam> {
  const { data } = await axiosClient.put<ApiSingleResponse<Exam>>(`/exams/${examId}`, payload);
  return data.data;
}

export async function deleteExam(examId: string): Promise<void> {
  await axiosClient.delete(`/exams/${examId}`);
}

export async function publishExam(examId: string): Promise<Exam> {
  const { data } = await axiosClient.post<ApiSingleResponse<Exam>>(`/exams/${examId}/publish`);
  return data.data;
}

export async function generateVersions(examId: string, payload: GenerateVersionsPayload): Promise<ExamVersion[]> {
  const { data } = await axiosClient.post<ApiSingleResponse<ExamVersion[]>>(`/exams/${examId}/versions/generate`, payload);
  return data.data;
}

export async function getVersions(examId: string): Promise<ExamVersion[]> {
  const { data } = await axiosClient.get<ApiSingleResponse<ExamVersion[]>>(`/exams/${examId}/versions`);
  return data.data;
}

export async function getVersion(examId: string, versionId: string): Promise<ExamVersionDetail> {
  const { data } = await axiosClient.get<ApiSingleResponse<ExamVersionDetail>>(`/exams/${examId}/versions/${versionId}`);
  return data.data;
}

export async function getExamPrint(examId: string): Promise<ExamPrint> {
  const { data } = await axiosClient.get<ApiSingleResponse<ExamPrint>>(`/exams/${examId}/print`);
  return data.data;
}

/** Number of questions a template holds = rows of all its answer zones. */
export function templateQuestionTotal(grid: { answer_zones?: Array<{ layout: { rows: number } }> } | undefined): number {
  return (grid?.answer_zones ?? []).reduce((sum, z) => sum + z.layout.rows, 0);
}

export type VersionPlanIssue =
  | "COUNT" | "EMPTY" | "NEGATIVE" | "EXCEED_TEMPLATE" | "NOT_ENOUGH_EASY" | "NOT_ENOUGH_MEDIUM" | "NOT_ENOUGH_HARD";

/**
 * Checks the recipe before it goes to the server (the server checks again):
 *  – fewer questions than the answer sheet is fine (the spare rows stay blank), MORE is not allowed;
 *  – the bank must hold enough questions of each level.
 */
export function checkVersionPlan(
  plan: GenerateVersionsPayload,
  bank: { easy: number; medium: number; hard: number } | null,
  templateTotal: number | null,
): VersionPlanIssue[] {
  const issues: VersionPlanIssue[] = [];
  if (!Number.isInteger(plan.count) || plan.count < 1 || plan.count > MAX_VERSIONS) issues.push("COUNT");
  const parts = [plan.easy, plan.medium, plan.hard];
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) issues.push("NEGATIVE");
  const total = parts.reduce((a, b) => a + (Number.isInteger(b) && b > 0 ? b : 0), 0);
  if (total < 1) issues.push("EMPTY");
  if (templateTotal != null && total > templateTotal) issues.push("EXCEED_TEMPLATE");
  if (bank) {
    if (plan.easy > bank.easy) issues.push("NOT_ENOUGH_EASY");
    if (plan.medium > bank.medium) issues.push("NOT_ENOUGH_MEDIUM");
    if (plan.hard > bank.hard) issues.push("NOT_ENOUGH_HARD");
  }
  return issues;
}

// ── results, statistics, violations, analysis ──

export interface ScoreBucket { label: string; from: number; to: number; count: number }

export interface ExamStats {
  total_students: number;
  /** papers that are marked */
  total_papers: number;
  /** ONLINE / SUBMIT only: every paper handed in */
  submitted_count?: number;
  /** teacher only */
  violation_count?: number;
  max_score: number;
  highest: number | null;
  lowest: number | null;
  average: number | null;
  distribution: ScoreBucket[];
}

export interface Participant {
  student_id: string;
  student_code: string;
  full_name: string;
  email: string | null;
  has_result: boolean;
  result_id: string | null;
  total_score: number | null;
  total_correct: number | null;
  is_violation: boolean;
  submitted_at: string | null;
  /** ONLINE (phone): NOT_STARTED / IN_PROGRESS / LOCKED / SUBMITTED; absent for other formats */
  attempt_status?: "NOT_STARTED" | "IN_PROGRESS" | "LOCKED" | "SUBMITTED";
  left_count?: number;
  /** when the phone's answers reached the server, and when the system marked the paper */
  synced_at?: string | null;
  graded_at?: string | null;
  /** ONLINE: reported for leaving the exam screen; flag_decision null = the teacher has not decided yet */
  is_flagged?: boolean;
  flag_reason?: string | null;
  flag_decision?: FlagDecision | null;
  penalty_points?: number | null;
}

export type FlagDecision = "ZERO" | "DEDUCT" | "DISMISS";

export interface ResultRow {
  id: string;
  student_id: string;
  student_code: string;
  full_name: string;
  test_code: string | null;
  total_correct: number | null;
  total_questions: number | null;
  total_score: number | null;
  is_violation: boolean;
  violation_reason: string | null;
  has_image: boolean;
  source: string;
  status: string;
  submitted_at: string | null;
  /** when the system marked the paper */
  graded_at?: string | null;
  /** ONLINE: when the phone's answers reached the server (the phone may have worked offline before) */
  synced_at?: string | null;
  /** ONLINE: when the student handed in on his phone */
  client_submitted_at?: string | null;
  /** ONLINE: reported for leaving the exam screen (leave_policy FLAG); the teacher decides what it costs */
  is_flagged?: boolean;
  flag_reason?: string | null;
  flag_decision?: FlagDecision | null;
  penalty_points?: number | null;
}

export interface ResultOption { label: string; content: string; is_correct: boolean }
export interface ResultAnswer {
  order: number;
  choice: string | null;
  correct_answer: string;
  is_correct: boolean;
  /** the question as printed on the paper, its options and the explanation (when there is one) */
  question?: string | null;
  options?: ResultOption[];
  explanation?: string | null;
}
export interface ResultDetail { result: ResultRow; max_score: number; answers: ResultAnswer[] }
export interface MyResult { released: boolean; submitted: boolean; detail?: ResultDetail; /** reported and not decided yet: the score is held back */ pending_review?: boolean }

export interface OptionStat { label: string; content: string; is_correct: boolean; count: number; percent: number }
export interface QuestionStat {
  question_id: string;
  content: string;
  difficulty: string | null;
  question_type: string | null;
  test_codes: string[];
  appeared: number;
  blank_count: number;
  blank_percent: number;
  correct_count: number;
  correct_percent: number;
  options: OptionStat[];
}
export interface ExamAnalysis { total_papers: number; test_codes: string[]; questions: QuestionStat[] }

export interface RecordResultPayload {
  student_id?: string;
  student_code?: string;
  test_code?: string;
  answers: Array<{ order: number; choice: string }>;
}

export const getExamStats = async (id: string) => (await axiosClient.get<ApiSingleResponse<ExamStats>>(`/exams/${id}/stats`)).data.data;
export const getParticipants = async (id: string, submitted = false) =>
  (await axiosClient.get<ApiSingleResponse<Participant[]>>(`/exams/${id}/participants`, { params: submitted ? { submitted: true } : undefined })).data.data;
export const unlockAttempt = async (id: string, studentId: string) =>
  (await axiosClient.post<ApiSingleResponse<Participant>>(`/exams/${id}/attempts/${studentId}/unlock`)).data.data;
export const getResults = async (id: string) => (await axiosClient.get<ApiSingleResponse<ResultRow[]>>(`/exams/${id}/results`)).data.data;
export const getResult = async (id: string, resultId: string) => (await axiosClient.get<ApiSingleResponse<ResultDetail>>(`/exams/${id}/results/${resultId}`)).data.data;
export const getMyResult = async (id: string) => (await axiosClient.get<ApiSingleResponse<MyResult>>(`/exams/${id}/my-result`)).data.data;
export const getViolations = async (id: string) => (await axiosClient.get<ApiSingleResponse<ResultRow[]>>(`/exams/${id}/violations`)).data.data;
/** What a paper reported for leaving the exam screen costs: ZERO (0 points), DEDUCT (minus penalty_points) or DISMISS. */
export const decideFlag = async (id: string, studentId: string, decision: FlagDecision, penaltyPoints?: number) =>
  (await axiosClient.put<ApiSingleResponse<Participant>>(`/exams/${id}/flags`, { student_id: studentId, decision, penalty_points: penaltyPoints })).data.data;
export const getAnalysis = async (id: string) => (await axiosClient.get<ApiSingleResponse<ExamAnalysis>>(`/exams/${id}/analysis`)).data.data;
export const recordResult = async (id: string, payload: RecordResultPayload) => (await axiosClient.post<ApiSingleResponse<ResultDetail>>(`/exams/${id}/results`, payload)).data.data;
export const setViolation = async (id: string, studentId: string, violation: boolean, reason?: string) =>
  (await axiosClient.put<ApiSingleResponse<Participant>>(`/exams/${id}/violations`, { student_id: studentId, violation, reason })).data.data;
export const setResultsPublished = async (id: string, publish: boolean) =>
  (await axiosClient.post<ApiSingleResponse<Exam>>(`/exams/${id}/results/${publish ? "publish" : "unpublish"}`)).data.data;

/** The photo of a paper as an object URL (the endpoint needs the login token, so an <img src> cannot call it directly). */
export async function getResultImageUrl(id: string, resultId: string, kind?: "marked" | "dewarped" | "raw"): Promise<string> {
  const res = await axiosClient.get<Blob>(`/exams/${id}/results/${resultId}/image`, { params: kind ? { kind } : undefined, responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export async function uploadResultImage(id: string, resultId: string, file: File, kind: "marked" | "dewarped" | "raw" = "marked"): Promise<ResultRow> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const { data } = await axiosClient.post<ApiSingleResponse<ResultRow>>(`/exams/${id}/results/${resultId}/image`, form);
  return data.data;
}

// ── dashboard ──

export interface OverviewExam {
  id: string; name: string; subject: string | null; class_id: string | null; class_name: string | null;
  format: ExamFormat; status: ExamStatus; from_time: string | null; to_time: string | null; my_role: ExamRole;
}
export interface ExamOverview {
  upcoming_count: number; ongoing_count: number; completed_count: number; draft_count: number; class_count: number;
  upcoming: OverviewExam[]; ongoing: OverviewExam[]; completed: OverviewExam[];
  classes: Array<{ id: string; name: string; role: ExamRole }>;
}
export const getExamOverview = async () => (await axiosClient.get<ApiSingleResponse<ExamOverview>>("/exams/overview")).data.data;

// ── export ──

export const timeText = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { hour12: false });
};
export const scoreText = (v: number | null | undefined) => (v == null ? "—" : Number(v).toLocaleString("vi-VN", { maximumFractionDigits: 2 }));

/** Rows for the export: student code (HSxxxxxxxx), version, right answers, score. A violation is 0 points. */
export function exportRows(rows: ResultRow[]) {
  return rows.map((r) => ({
    code: r.student_code, name: r.full_name, version: r.test_code ?? "", correct: r.total_correct ?? 0,
    questions: r.total_questions ?? 0, score: r.total_score ?? 0, violation: r.is_violation ? (r.violation_reason || "Vi phạm") : "",
  }));
}

/** ONLINE exams: Excel without photos. */
export async function downloadExamExcel(examName: string, rows: ResultRow[]) {
  const XLSX = await import("xlsx");
  const data = [["Mã số học sinh", "Họ tên", "Mã đề", "Số câu đúng", "Điểm", "Vi phạm"],
    ...exportRows(rows).map((r) => [r.code, r.name, r.version, r.correct, r.score, r.violation])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 16 }, { wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kết quả");
  XLSX.writeFile(wb, `${examName.replace(/[\\/:*?"<>|]+/g, " ").trim() || "ky-thi"} - ket qua.xlsx`);
}
