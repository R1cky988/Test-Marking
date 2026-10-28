import { create } from "zustand";
import type { Exam, ExamVersion, IdentificationMode, ShuffleMode, Template } from "@/types/academic.types";

export interface QuestionDraft {
  id?: string;
  question_bank_item_id?: string | null;
  difficulty?: string | null;
  topic?: string | null;
  content: string;
  options: string[];
  correctAnswer: string | string[];
}

interface CreateExamWizardState {
  step: number;
  exam: Exam | null;
  selectedTemplate: Template | null;
  templateId: string;
  questions: QuestionDraft[];
  shuffleMode: ShuffleMode;
  versionCount: number;
  versions: ExamVersion[];
  selectedClassIds: string[];
  identificationMode: IdentificationMode;
  setStep: (step: number) => void;
  setExam: (exam: Exam | null) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setTemplateId: (templateId: string) => void;
  setSelectedClassIds: (classIds: string[]) => void;
  setIdentificationMode: (mode: IdentificationMode) => void;
  setQuestions: (questions: QuestionDraft[]) => void;
  updateQuestion: (index: number, patch: Partial<QuestionDraft>) => void;
  setShuffleMode: (mode: ShuffleMode) => void;
  setVersionCount: (count: number) => void;
  setVersions: (versions: ExamVersion[]) => void;
  reset: () => void;
}

function createBlankQuestions(total: number, choicesPerQuestion = 4): QuestionDraft[] {
  const choices = Math.max(2, choicesPerQuestion);
  return Array.from({ length: Math.max(0, total) }, () => ({
    content: "",
    options: Array.from({ length: choices }, () => ""),
    correctAnswer: "A",
  }));
}

export const useCreateExamWizardStore = create<CreateExamWizardState>((set) => ({
  step: 1,
  exam: null,
  selectedTemplate: null,
  templateId: "",
  questions: [],
  shuffleMode: "both",
  versionCount: 4,
  versions: [],
  selectedClassIds: [],
  identificationMode: "internal",
  setStep: (step) => set({ step }),
  setExam: (exam) => set({ exam }),
  setSelectedTemplate: (selectedTemplate) =>
    set({ selectedTemplate, templateId: selectedTemplate?.id ?? "" }),
  setTemplateId: (templateId) => set({ templateId }),
  setSelectedClassIds: (selectedClassIds) => set({ selectedClassIds }),
  setIdentificationMode: (identificationMode) => set({ identificationMode }),
  setQuestions: (questions) => set({ questions }),
  updateQuestion: (index, patch) =>
    set((state) => ({
      questions: state.questions.map((question, currentIndex) =>
        currentIndex === index ? { ...question, ...patch } : question,
      ),
    })),
  setShuffleMode: (shuffleMode) => set({ shuffleMode }),
  setVersionCount: (versionCount) => set({ versionCount }),
  setVersions: (versions) => set({ versions }),
  reset: () =>
    set({
      step: 1,
      exam: null,
      selectedTemplate: null,
      templateId: "",
      questions: createBlankQuestions(0),
      shuffleMode: "both",
      versionCount: 4,
      versions: [],
      selectedClassIds: [],
      identificationMode: "internal",
    }),
}));

export { createBlankQuestions };
