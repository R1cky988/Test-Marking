import axiosClient from "@/api/axiosClient";
import type { ApiSingleResponse, QuestionBank } from "@/types/academic.types";

// Question banks and their questions: /question-banks (Spring). A bank belongs to the person who created it.
// Content, options and explanation are LaTeX-friendly text ($x^2$, $$\frac{a}{b}$$), stored exactly as typed.

export type QuestionType = "SINGLE" | "MULTIPLE";
export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";

export const MAX_OPTIONS = 5;
export const MIN_OPTIONS = 2;
export const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

export interface QuestionOption {
  label: string;
  content: string;
  is_correct: boolean;
}

export interface QuestionBankItem {
  id: string;
  bank_id: string;
  content: string;
  explanation: string | null;
  question_type: QuestionType;
  options: QuestionOption[];
  correct_answers: string[];
  difficulty: QuestionDifficulty;
  created_at: string | null;
  updated_at: string | null;
}

/** What the editor sends: options in order A, B, C...; correct_answers = their labels. */
export interface QuestionBankItemInput {
  content: string;
  explanation?: string;
  options: string[];
  question_type: QuestionType;
  correct_answers: string[];
  difficulty: QuestionDifficulty;
}

export interface QuestionBankInfo extends QuestionBank {
  subject: string | null;
}

interface RawQuestionBank {
  id: string;
  name: string;
  subject?: string | null;
  description?: string | null;
  items_count?: number;
  difficulty_counts?: { easy: number; medium: number; hard: number };
  created_at?: string | null;
  updated_at?: string | null;
}

function normalizeBank(raw: RawQuestionBank): QuestionBankInfo {
  return {
    id: raw.id,
    name: raw.name,
    subject: raw.subject ?? null,
    description: raw.description ?? null,
    teacher_id: "",
    items_count: raw.items_count ?? 0,
    difficulty_counts: raw.difficulty_counts ?? { easy: 0, medium: 0, hard: 0 },
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  };
}

// ── banks ──

export async function getQuestionBanks(search?: string): Promise<QuestionBankInfo[]> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawQuestionBank[]>>("/question-banks", {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  return data.data.map(normalizeBank);
}

export async function getQuestionBank(bankId: string): Promise<QuestionBankInfo> {
  const { data } = await axiosClient.get<ApiSingleResponse<RawQuestionBank>>(`/question-banks/${bankId}`);
  return normalizeBank(data.data);
}

export interface QuestionBankPayload {
  name: string;
  subject?: string;
  description?: string;
}

export async function createQuestionBank(payload: QuestionBankPayload): Promise<QuestionBankInfo> {
  const { data } = await axiosClient.post<ApiSingleResponse<RawQuestionBank>>("/question-banks", payload);
  return normalizeBank(data.data);
}

export async function updateQuestionBank(bankId: string, payload: QuestionBankPayload): Promise<QuestionBankInfo> {
  const { data } = await axiosClient.put<ApiSingleResponse<RawQuestionBank>>(`/question-banks/${bankId}`, payload);
  return normalizeBank(data.data);
}

export async function deleteQuestionBank(bankId: string): Promise<void> {
  await axiosClient.delete(`/question-banks/${bankId}`);
}

// ── questions ──

export interface QuestionListParams {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: QuestionDifficulty | "all";
  type?: QuestionType | "all";
}

export interface QuestionListResult {
  data: QuestionBankItem[];
  meta: { page: number; limit: number; total: number };
}

export async function getQuestionBankItems(bankId: string, params: QuestionListParams = {}): Promise<QuestionListResult> {
  const clean: Record<string, string | number> = {};
  if (params.page) clean.page = params.page;
  if (params.limit) clean.limit = params.limit;
  if (params.search?.trim()) clean.search = params.search.trim();
  if (params.difficulty && params.difficulty !== "all") clean.difficulty = params.difficulty.toLowerCase();
  if (params.type && params.type !== "all") clean.type = params.type.toLowerCase();
  const { data } = await axiosClient.get<QuestionListResult>(`/question-banks/${bankId}/questions`, { params: clean });
  return { data: data.data, meta: data.meta };
}

export async function createQuestionBankItem(bankId: string, payload: QuestionBankItemInput): Promise<QuestionBankItem> {
  const { data } = await axiosClient.post<ApiSingleResponse<QuestionBankItem>>(`/question-banks/${bankId}/questions`, payload);
  return data.data;
}

export async function updateQuestionBankItem(bankId: string, itemId: string, payload: QuestionBankItemInput): Promise<QuestionBankItem> {
  const { data } = await axiosClient.put<ApiSingleResponse<QuestionBankItem>>(`/question-banks/${bankId}/questions/${itemId}`, payload);
  return data.data;
}

export async function deleteQuestionBankItem(bankId: string, itemId: string): Promise<void> {
  await axiosClient.delete(`/question-banks/${bankId}/questions/${itemId}`);
}

export interface ImportQuestionsResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export async function importQuestionBankFile(bankId: string, file: File): Promise<ImportQuestionsResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await axiosClient.post<ApiSingleResponse<ImportQuestionsResult>>(`/question-banks/${bankId}/questions/import`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

/** Header + two example rows (one single-answer, one multiple-answer, with LaTeX) of the .xlsx import template. */
export const IMPORT_QUESTION_TEMPLATE_ROWS: Array<Array<string | number>> = [
  ["STT", "Nội dung câu hỏi", "A", "B", "C", "D", "E", "Đáp án đúng", "Độ khó", "Lời giải"],
  [1, "Giá trị của $2^3$ là", "6", "8", "9", "12", "", "B", "easy", "$2^3 = 2\\cdot 2\\cdot 2 = 8$"],
  [2, "Các nghiệm của $x^2-5x+6=0$ là", "$1$", "$2$", "$3$", "$4$", "", "B,C", "medium", "$(x-2)(x-3)=0$"],
];

/** Image upload of the old rich-text editor (still used by the exam wizard). The question bank itself is plain text + LaTeX. */
export async function uploadQuestionBankRichTextImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axiosClient.post<ApiSingleResponse<{ file_url?: string; location?: string }>>(
    "/web/question-bank-items/image",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  const url = data.data.location ?? data.data.file_url;
  if (!url) throw new Error("Upload response is missing image URL");
  return url;
}
