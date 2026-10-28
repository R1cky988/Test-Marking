import type { Question, QuestionInput } from "@/types/academic.types";

// ─────────────────────────────────────────────────────────────────────────────
// Questions, Spring backend.
//
// 1) Questions of a QUESTION BANK are fully served by Spring (/api/v1/question-banks/{id}/questions...).
//    They live in questionBanks.api.ts and are re-exported here, so one import path covers them:
//      getQuestionBankItems, createQuestionBankItem, updateQuestionBankItem, deleteQuestionBankItem,
//      importQuestionBankFile.
//
// 2) Questions of an EXAM (versions, answer key, reorder, Excel preview) have NO Spring endpoint yet: the Spring
//    backend has no exam-question controller. The functions below keep the old names, so the exam wizard still
//    compiles, but they fail with a clear message instead of calling the old NestJS "/web/..." routes (404).
//    When the Spring side exists, replace the body of each function with the real call.
// ─────────────────────────────────────────────────────────────────────────────

export {
  getQuestionBankItems,
  createQuestionBankItem,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  importQuestionBankFile,
  OPTION_LABELS,
  MIN_OPTIONS,
  MAX_OPTIONS,
} from "./questionBanks.api";
export type {
  QuestionBankItem,
  QuestionBankItemInput,
  QuestionListParams,
  QuestionListResult,
  QuestionOption,
  QuestionType,
  QuestionDifficulty,
} from "./questionBanks.api";

export class ExamQuestionsNotAvailableError extends Error {
  constructor(feature: string) {
    super(`Chưa có API Spring cho "${feature}" (câu hỏi của kỳ thi). Hiện chỉ ngân hàng câu hỏi dùng được.`);
    this.name = "ExamQuestionsNotAvailableError";
  }
}

function notAvailable(feature: string): never {
  throw new ExamQuestionsNotAvailableError(feature);
}

type PreviewResult = { total_questions: number; choices_per_question: number; questions: QuestionInput[] };

export async function getExamQuestions(_examId: string): Promise<Question[]> {
  return notAvailable("danh sách câu hỏi của kỳ thi");
}

export async function getExamVersionQuestions(_examId: string, _versionId: string): Promise<Question[]> {
  return notAvailable("câu hỏi theo mã đề");
}

export async function saveExamQuestionsBulk(_examId: string, _questions: QuestionInput[]): Promise<Question[]> {
  return notAvailable("lưu câu hỏi của kỳ thi");
}

export const createBulkQuestions = saveExamQuestionsBulk;

export async function updateQuestion(
  _questionId: string,
  _payload: Partial<QuestionInput> & { confirm_regrade?: boolean },
): Promise<{ question: Question; warnings: string[]; regrading_jobs: string[] }> {
  return notAvailable("sửa câu hỏi");
}

export async function updateExamQuestionSnapshot(
  _examQuestionId: string,
  _payload: {
    snapshot?: { content?: string; options?: string[]; correct_answer?: string | string[]; correctAnswer?: string | string[] };
    content?: string;
    options?: string[];
    correct_answer?: string | string[];
    correctAnswer?: string | string[];
    confirm_regrade?: boolean;
  },
): Promise<{ question: Question; warnings: string[]; regrading_jobs: string[] }> {
  return notAvailable("sửa câu hỏi trong đề");
}

export async function reorderExamQuestions(_examId: string, _order: string[], _versionId?: string): Promise<Question[]> {
  return notAvailable("sắp xếp lại câu hỏi");
}

export async function downloadQuestionTemplate(_examId: string): Promise<Blob> {
  return notAvailable("tải file mẫu câu hỏi của kỳ thi");
}

export async function previewImportQuestionsExcel(_examId: string, _file: File): Promise<PreviewResult> {
  return notAvailable("xem trước import câu hỏi của kỳ thi");
}

export async function previewImportQuestionsExcelByShape(_params: {
  total_questions: number;
  choices_per_question: number;
  file: File;
}): Promise<PreviewResult> {
  return notAvailable("xem trước import câu hỏi theo cỡ phiếu");
}

export async function importQuestionsExcel(
  _examId: string,
  _file: File,
): Promise<{ imported: number; skipped: number; errors: Array<{ row?: number; reason: string }>; questions: Question[] }> {
  return notAvailable("import câu hỏi vào kỳ thi");
}
