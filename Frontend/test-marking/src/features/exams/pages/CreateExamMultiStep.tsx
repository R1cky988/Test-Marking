import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { useGoBack } from "@/hooks/useGoBack";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  GripVertical,
  RefreshCw,
  Save,
  Shuffle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MathJaxContent } from "@/components/rich-text/MathJaxContent";
import { RichTextEditor } from "@/components/rich-text/RichTextEditor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClasses } from "@/features/classes/classes.api";
import {
  downloadQuestionTemplate,
  getExamQuestions,
  previewImportQuestionsExcel,
  previewImportQuestionsExcelByShape,
  reorderExamQuestions,
  updateExamQuestionSnapshot,
} from "@/features/questions/questions.api";
import { getQuestionBanks } from "@/features/questions/questionBanks.api";
import { OMRTemplateDesigner, type OMRTemplateDraft } from "@/features/templates/OMRTemplateDesigner";
import { createTemplate, getTemplate, getTemplates } from "@/features/templates/templates.api";
import { formatUserFacingMessage, getApiErrorMessage } from "@/lib/apiErrorMessage";
import type {
  ClassListItem,
  Exam,
  ExamVersion,
  GradingType,
  IdentificationMode,
  Question,
  QuestionInput,
  QuestionBank,
  ShuffleMode,
  Template,
} from "@/types/academic.types";
import {
  createExamAssignments,
  createExam,
  deleteAllExamVersions,
  exportAllExamPdfs,
  exportExamVersions,
  generateExamQuestions,
  generateExamVersions,
  generateExamVersionsFromBank,
  getExam,
  getExamAssignments,
  getExamVersions,
  importAnswerKeys,
  saveAnswerKeysByVersion,
  updateExam,
} from "../exams.api";
import { createBlankQuestions, useCreateExamWizardStore } from "./createExam.store";
import type { QuestionDraft } from "./createExam.store";

const generalSchema = z.object({
  name: z.string().trim().min(1, i18n.t("createExam.validation.nameRequired")),
  subject: z.string().trim().min(1, i18n.t("createExam.validation.subjectRequired")),
  duration: z.number().int().min(1, i18n.t("createExam.validation.durationRequired")),
  score_scale: z.number().min(1, "Thang điểm tối thiểu là 1").max(100, "Thang điểm tối đa là 100"),
  class_ids: z.array(z.string().trim()).min(1, i18n.t("createExam.validation.classRequired")),
  identification_mode: z.enum(["internal", "external"]),
  grading_type: z.enum(["TEACHER_GRADING", "STUDENT_SUBMISSION"]),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
}).refine(
  (data) => {
    if (data.grading_type === "STUDENT_SUBMISSION") {
      return !!data.start_time && !!data.end_time;
    }
    return true;
  },
  {
    message: i18n.t("createExam.validation.timeRequired"),
    path: ["start_time"],
  },
).refine(
  (data) => {
    if (data.grading_type === "STUDENT_SUBMISSION" && data.start_time && data.end_time) {
      return new Date(data.end_time) > new Date(data.start_time);
    }
    return true;
  },
  {
    message: i18n.t("createExam.validation.endAfterStart"),
    path: ["end_time"],
  },
);

const shuffleSchema = z.object({
  shuffleMode: z.enum(["none", "questions", "choices", "both"]),
  versionCount: z.coerce.number().int().min(1, i18n.t("createExam.validation.versionCountMin")).max(999, i18n.t("createExam.validation.versionCountMax")),
});

type GeneralValues = z.infer<typeof generalSchema>;

const defaultGeneralValues: GeneralValues = {
  name: "",
  subject: "",
  duration: 45,
  score_scale: 10,
  class_ids: [],
  identification_mode: "internal",
  grading_type: "TEACHER_GRADING",
  start_time: "",
  end_time: "",
};

const shuffleModeLabels: Record<ShuffleMode, string> = {
  none: i18n.t("createExam.shuffleMode.none"),
  questions: i18n.t("createExam.shuffleMode.questions"),
  choices: i18n.t("createExam.shuffleMode.choices"),
  both: i18n.t("createExam.shuffleMode.both"),
};

const identificationLabelKeys: Record<IdentificationMode, string> = {
  internal: "exams.identificationDetail.internal",
  external: "exams.identificationDetail.external",
};

const studentSubmissionTemplateError = "Bài học sinh nộp bắt buộc template phải bật mã học sinh trong vùng ID";

interface TemplateShape {
  totalQuestions: number;
  choicesPerQuestion: number;
  isValid: boolean;
  hasStudentId: boolean;
}

interface CreateExamMultiStepProps {
  examId?: string;
  embedded?: boolean;
  onCompleted?: () => void;
  initialStep?: number;
  onDraftExamChange?: (examId: string | null) => void;
}

interface ImportIssue {
  row: number;
  column: string;
  message: string;
}

interface QuickAnswerVersionDraft {
  versionCode: string;
  answerKey: Record<string, string | string[]>;
}

function stepClass(active: boolean) {
  return active ? "bg-blue-600 text-white shadow-sm shadow-blue-950/10" : "bg-blue-50 text-blue-700";
}

function getChoiceLabels(count: number) {
  return Array.from({ length: Math.max(2, count) }, (_, index) => String.fromCharCode(65 + index));
}

function toDateTimeLocalInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTemplateShape(template: Template | null): TemplateShape {
  const answerZones = template?.grid_config.answer_zones ?? [];
  const idItems = template?.grid_config.id_zones?.items ?? [];
  const optionCounts = answerZones
    .map((zone) => Number(zone.layout?.options ?? 0))
    .filter((value) => Number.isInteger(value) && value > 0);
  const uniqueOptionCounts = [...new Set(optionCounts)];
  return {
    totalQuestions: answerZones.reduce((sum, zone) => sum + Number(zone.layout?.rows ?? 0), 0),
    choicesPerQuestion: uniqueOptionCounts[0] ?? 4,
    isValid: answerZones.length > 0 && uniqueOptionCounts.length === 1,
    hasStudentId: idItems.some((item) => item.type === "student_id" && item.enabled !== false),
  };
}

function normalizeAnswer(answer: string | string[] | undefined) {
  if (Array.isArray(answer)) return answer.join(", ");
  return answer ?? "";
}

function normalizeAnswerList(answer: string | string[] | undefined) {
  if (Array.isArray(answer)) {
    return answer.map((item) => item.trim()).filter(Boolean);
  }

  return (answer ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasAnswerValue(answer: string | string[] | undefined) {
  return normalizeAnswerList(answer).length > 0;
}

function hasRichTextContent(value: string | undefined | null) {
  const html = String(value ?? "");
  if (/<img\b|<video\b|<iframe\b|<table\b/i.test(html)) return true;

  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0;
}

function toQuestionInputs(questions: QuestionDraft[]): QuestionInput[] {
  return questions.map((question) => ({
    content: question.content,
    options: question.options.map((content, index) => ({
      content,
      order_index: index,
      is_correct: normalizeAnswerList(question.correctAnswer).includes(getChoiceLabels(question.options.length)[index]),
    })),
  }));
}

function buildAnswerKey(questions: QuestionDraft[]): Record<string, string | string[]> {
  return questions.reduce<Record<string, string | string[]>>((acc, question, index) => {
    acc[String(index + 1)] = question.correctAnswer;
    return acc;
  }, {});
}

function validateQuestions(questions: QuestionDraft[], totalQuestions: number, choicesPerQuestion: number) {
  if (questions.length !== totalQuestions) {
    return i18n.t("createExam.validation.questionCount", { count: totalQuestions });
  }

  for (let index = 0; index < questions.length; index++) {
    const question = questions[index];
    if (!hasRichTextContent(question.content)) return i18n.t("createExam.validation.missingContent", { num: index + 1 });
    if (question.options.length !== choicesPerQuestion) return i18n.t("createExam.validation.wrongChoiceCount", { num: index + 1 });
    const emptyOptionIndex = question.options.findIndex((option) => !hasRichTextContent(option));
    if (emptyOptionIndex >= 0) {
      return i18n.t("createExam.validation.missingChoice", { num: index + 1, label: getChoiceLabels(choicesPerQuestion)[emptyOptionIndex] });
    }
    const answers = normalizeAnswerList(question.correctAnswer);
    if (answers.length === 0 || answers.some((answer) => !getChoiceLabels(choicesPerQuestion).includes(answer))) {
      return i18n.t("createExam.validation.invalidAnswer", { num: index + 1 });
    }
  }

  return null;
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index++;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function buildQuestionTemplateCsv(totalQuestions: number, choicesPerQuestion: number) {
  const choiceLabels = getChoiceLabels(choicesPerQuestion);
  const headers = ["STT", "Nội dung câu hỏi", ...choiceLabels, "Đáp án đúng"];
  const rows = Array.from({ length: totalQuestions }, (_, index) => [
    index + 1,
    "",
    ...choiceLabels.map(() => ""),
    "A",
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

function validateImportedQuestions(
  rows: string[][],
  totalQuestions: number,
  choicesPerQuestion: number,
): { issues: ImportIssue[]; questions: QuestionDraft[] } {
  const issues: ImportIssue[] = [];
  const choiceLabels = getChoiceLabels(choicesPerQuestion);
  const expectedColumns = choicesPerQuestion + 3;
  const dataRows = rows.slice(1);

  if (rows.length === 0) {
    return {
      issues: [{ row: 1, column: "File", message: i18n.t("createExam.validation.importEmptyFile") }],
      questions: [],
    };
  }

  if (rows[0].length !== expectedColumns) {
    issues.push({
      row: 1,
      column: "Header",
      message: i18n.t("createExam.validation.importColumnCount", { count: expectedColumns }),
    });
  }

  if (dataRows.length !== totalQuestions) {
    issues.push({
      row: 0,
      column: "So dong",
      message: i18n.t("createExam.validation.importRowCount", { count: totalQuestions }),
    });
  }

  const questions: QuestionDraft[] = dataRows.slice(0, totalQuestions).map((row, rowIndex) => {
    const displayRow = rowIndex + 2;
    if (row.length !== expectedColumns) {
      issues.push({
        row: displayRow,
        column: "So cot",
        message: i18n.t("createExam.validation.importRowWrongCols", { row: displayRow, actual: row.length, expected: expectedColumns }),
      });
    }

    const questionNumber = Number(row[0]);
    if (questionNumber !== rowIndex + 1) {
      issues.push({
        row: displayRow,
        column: "STT",
        message: i18n.t("createExam.validation.importSeqWrong", { expected: rowIndex + 1 }),
      });
    }

    const content = row[1]?.trim() ?? "";
    if (!content) {
      issues.push({ row: displayRow, column: "Nội dung câu hỏi", message: i18n.t("createExam.validation.importEmptyContent") });
    }

    const options = choiceLabels.map((label, optionIndex) => {
      const value = row[2 + optionIndex]?.trim() ?? "";
      if (!value) {
        issues.push({ row: displayRow, column: label, message: i18n.t("createExam.validation.importEmptyOption") });
      }
      return value;
    });

    const answer = (row[2 + choicesPerQuestion] ?? "").trim().toUpperCase();
    const answerParts = answer.split(",").map((part) => part.trim()).filter(Boolean);
    if (answerParts.length !== 1 || !choiceLabels.includes(answerParts[0])) {
      issues.push({
        row: displayRow,
        column: "Đáp án đúng",
        message: i18n.t("createExam.validation.importInvalidAnswer", { labels: choiceLabels.join(", ") }),
      });
    }

    return {
      content,
      options,
      correctAnswer: answerParts[0] ?? "A",
    };
  });

  return { issues, questions };
}

function toQuestionDraftsFromInputs(inputs: QuestionInput[], choicesPerQuestion: number): QuestionDraft[] {
  const choiceLabels = getChoiceLabels(choicesPerQuestion);
  return inputs.map((question) => {
    const correctAnswers = question.options
      .map((option, index) => option.is_correct ? choiceLabels[index] : null)
      .filter((label): label is string => Boolean(label));
    return {
      content: question.content,
      options: question.options.map((option) => option.content),
      correctAnswer: correctAnswers.length <= 1 ? correctAnswers[0] ?? "A" : correctAnswers,
    };
  });
}

function toQuestionDraftsFromQuestions(
  loadedQuestions: Question[],
  totalQuestions: number,
  choicesPerQuestion: number,
  preserveAll = false,
): QuestionDraft[] {
  if (loadedQuestions.length === 0) {
    return preserveAll ? [] : createBlankQuestions(totalQuestions, choicesPerQuestion);
  }

  const choiceLabels = getChoiceLabels(choicesPerQuestion);
  const drafts = [...loadedQuestions]
    .sort((a, b) => a.order_index - b.order_index)
    .map((question) => {
      const options = [...question.options].sort((a, b) => a.order_index - b.order_index);
      const correctAnswers = options
        .map((option, index) => option.is_correct ? choiceLabels[index] : null)
        .filter((label): label is string => Boolean(label));

      return {
        id: question.id,
        question_bank_item_id: question.question_bank_item_id,
        difficulty: question.difficulty,
        topic: question.topic,
        content: question.content,
        options: Array.from({ length: choicesPerQuestion }, (_, index) => options[index]?.content ?? ""),
        correctAnswer: question.correct_answer ?? (correctAnswers.length <= 1 ? correctAnswers[0] ?? "A" : correctAnswers),
      };
    });

  if (preserveAll) return drafts;
  if (drafts.length >= totalQuestions) return drafts.slice(0, totalQuestions);
  return [
    ...drafts,
    ...createBlankQuestions(totalQuestions - drafts.length, choicesPerQuestion),
  ];
}

export function CreateExamMultiStep({ examId, embedded = false, onCompleted, initialStep, onDraftExamChange }: CreateExamMultiStepProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // Back to exam detail if editing, otherwise back to exams list
  const goBack = useGoBack(examId ? `/exams/${examId}` : "/exams");
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [pendingImportedQuestions, setPendingImportedQuestions] = useState<QuestionDraft[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [bankShuffleMode, setBankShuffleMode] = useState<Extract<ShuffleMode, "questions" | "both">>("questions");
  const [randomTopic, setRandomTopic] = useState("");
  const [bankDistributionMode, setBankDistributionMode] = useState<"common" | "per_version">("common");
  const [commonDistribution, setCommonDistribution] = useState({ easy: 0, medium: 0, hard: 0 });
  const [versionDistributions, setVersionDistributions] = useState<
    Array<{ versionCode: string; easy: number; medium: number; hard: number }>
  >([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [quickAnswerVersions, setQuickAnswerVersions] = useState<QuickAnswerVersionDraft[]>([
    { versionCode: "001", answerKey: {} },
  ]);
  const [isSavingQuickAnswers, setIsSavingQuickAnswers] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [showBankWarningDialog, setShowBankWarningDialog] = useState(false);

  const {
    step,
    exam,
    selectedTemplate,
    templateId,
    questions,
    shuffleMode,
    versionCount,
    versions,
    identificationMode,
    setStep,
    setExam,
    setSelectedTemplate,
    setSelectedClassIds,
    setIdentificationMode,
    setQuestions,
    updateQuestion,
    setShuffleMode,
    setVersionCount,
    setVersions,
    reset,
  } = useCreateExamWizardStore();

  const form = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: defaultGeneralValues,
  });

  const watchedClassIds = form.watch("class_ids");
  const watchedIdentificationMode = form.watch("identification_mode");
  const watchedGradingType = form.watch("grading_type");
  const templateShape = useMemo(() => getTemplateShape(selectedTemplate), [selectedTemplate]);
  const choiceLabels = useMemo(
    () => getChoiceLabels(templateShape.choicesPerQuestion),
    [templateShape.choicesPerQuestion],
  );
  const selectedBank = useMemo(
    () => questionBanks.find((bank) => bank.id === selectedBankId) ?? null,
    [questionBanks, selectedBankId],
  );
  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null,
    [selectedVersionId, versions],
  );
  const displayedQuestions = useMemo(() => {
    if (!selectedVersion?.question_order?.length) return questions;
    const byId = new Map(questions.map((question) => [question.id, question]));
    return selectedVersion.question_order
      .map((id, index) => {
        const question = byId.get(id);
        if (!question) return null;
        const permutation = selectedVersion.choice_permutation?.[id] ?? null;
        const options = permutation
          ? permutation.map((optionIndex) => question.options[optionIndex] ?? "")
          : question.options;

        return {
          ...question,
          options,
          correctAnswer: selectedVersion.answer_key[String(index + 1)] ?? question.correctAnswer,
        };
      })
      .filter((question): question is QuestionDraft => Boolean(question));
  }, [questions, selectedVersion]);
  const bankWarnings = useMemo(() => {
    if (!selectedBank) return [];
    const configs =
      bankDistributionMode === "common"
        ? [{ versionCode: "all", ...commonDistribution }]
        : versionDistributions;
    const difficultyLabels = {
      easy: t("questionBanks.easy"),
      medium: t("questionBanks.medium"),
      hard: t("questionBanks.hard"),
    };

    return configs.flatMap((config) =>
      (["easy", "medium", "hard"] as const)
        .filter((level) => config[level] > selectedBank.difficulty_counts[level])
        .map(
          (level) =>
            t("createExam.step3.errors.bankInsufficientItem", {
              code: config.versionCode === "all" ? t("createExam.step3.commonAll") : config.versionCode,
              available: selectedBank.difficulty_counts[level],
              requested: config[level],
              level: difficultyLabels[level],
            }),
        ),
    );
  }, [bankDistributionMode, commonDistribution, selectedBank, t, versionDistributions]);
  const activeBankConfigs = useMemo(
    () =>
      bankDistributionMode === "common"
        ? [{ versionCode: "all", ...commonDistribution }]
        : versionDistributions,
    [bankDistributionMode, commonDistribution, versionDistributions],
  );
  const distributionErrors = useMemo(
    () =>
      activeBankConfigs
        .filter((config) => config.easy + config.medium + config.hard !== templateShape.totalQuestions)
        .map(
          (config) =>
            `${config.versionCode}: tong ${config.easy + config.medium + config.hard}/${templateShape.totalQuestions}`,
        ),
    [activeBankConfigs, templateShape.totalQuestions],
  );
  const canGenerateFromBank =
    Boolean(selectedBankId) && templateShape.isValid && versionCount >= 1 && versionCount <= 999 && distributionErrors.length === 0;

  const steps = useMemo(
    () => [
      { number: 1, title: t("createExam.steps.info") },
      { number: 2, title: t("createExam.steps.template") },
      { number: 3, title: t("createExam.steps.bank") },
      { number: 4, title: t("createExam.steps.preview") },
    ],
    [t],
  );

  useEffect(() => {
    if (!examId) {
      reset();
      form.reset(defaultGeneralValues);
    }
  }, [examId, form, reset]);

  useEffect(() => {
    onDraftExamChange?.(exam?.id ?? null);
  }, [exam?.id, onDraftExamChange]);

  useEffect(() => {
    async function loadClasses() {
      try {
        const response = await getClasses({ status: "active", page: 1, limit: 300 });
        setClasses(response.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("createExam.toasts.classLoadFailed")));
      }
    }

    void loadClasses();
    void loadTemplates();
    void loadQuestionBanks();
  }, []);

  useEffect(() => {
    if (!examId) return;

    async function loadExam() {
      try {
        setIsLoading(true);
        const loaded = await getExam(examId);
        const assignments = await getExamAssignments(loaded.id).catch(() => []);
        const loadedClassIds = assignments.map((assignment) => assignment.class_id);
        setExam(loaded);
        form.reset({
          name: loaded.name,
          subject: loaded.subject,
          duration: loaded.duration,
          score_scale: loaded.score_scale ?? 10,
          class_ids: loadedClassIds,
          identification_mode: loaded.identification_mode,
          grading_type: loaded.grading_type ?? "TEACHER_GRADING",
          start_time: toDateTimeLocalInputValue(loaded.start_time),
          end_time: toDateTimeLocalInputValue(loaded.end_time),
        });
        setSelectedClassIds(loadedClassIds);
        setIdentificationMode(loaded.identification_mode);

        const template = loaded.template ?? (loaded.template_id ? await getTemplate(loaded.template_id) : null);
        if (template) {
          setSelectedTemplate(template);
          const shape = getTemplateShape(template);
          const loadedQuestions = await getExamQuestions(loaded.id);
          setQuestions(toQuestionDraftsFromQuestions(loadedQuestions, shape.totalQuestions, shape.choicesPerQuestion, true));
        }

        const loadedVersions = await getExamVersions(loaded.id);
        setVersions(loadedVersions);
        setSelectedVersionId(loadedVersions[0]?.id ?? "");
        const resumeStep = initialStep ?? (loadedVersions.length > 0 ? 4 : template ? 3 : 1);
        setStep(Math.min(4, Math.max(1, resumeStep)));
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("createExam.toasts.examLoadFailed")));
      } finally {
        setIsLoading(false);
      }
    }

    void loadExam();
  }, [examId, form, initialStep, setExam, setIdentificationMode, setQuestions, setSelectedClassIds, setSelectedTemplate, setStep, setVersions]);

  useEffect(() => {
    setSelectedClassIds(watchedClassIds);
    const selectedClass = classes.find((item) => item.id === watchedClassIds[0]);
    if (selectedClass?.subject && !form.getValues("subject")) {
      form.setValue("subject", selectedClass.subject);
    }
  }, [classes, form, setSelectedClassIds, watchedClassIds]);

  useEffect(() => {
    setIdentificationMode(watchedIdentificationMode);
  }, [setIdentificationMode, watchedIdentificationMode]);

  useEffect(() => {
    const easy = Math.floor(templateShape.totalQuestions * 0.25);
    const hard = Math.floor(templateShape.totalQuestions * 0.25);
    const medium = Math.max(0, templateShape.totalQuestions - easy - hard);
    const base = { easy, medium, hard };
    setCommonDistribution(base);
    setVersionDistributions(
      Array.from({ length: Math.max(1, versionCount) }, (_, index) => ({
        versionCode: String(index + 1).padStart(3, "0"),
        ...base,
      })),
    );
  }, [templateShape.totalQuestions, versionCount]);

  async function loadTemplates() {
    try {
      setIsLoadingTemplates(true);
      setTemplates(await getTemplates());
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.templateLoadFailed")));
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  async function loadQuestionBanks() {
    try {
      setQuestionBanks(await getQuestionBanks());
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.bankLoadFailed")));
    }
  }

  async function handleStepOneNext() {
    const isValid = await form.trigger();
    if (isValid) setStep(2);
  }

  function selectTemplate(template: Template) {
    const shape = getTemplateShape(template);
    if (!shape.isValid) {
      toast.error(t("createExam.step2.templateInvalid"));
      return false;
    }
    if (form.getValues("grading_type") === "STUDENT_SUBMISSION" && !shape.hasStudentId) {
      toast.error(studentSubmissionTemplateError);
      return false;
    }
    setSelectedTemplate(template);
    setQuestions(createBlankQuestions(shape.totalQuestions, shape.choicesPerQuestion));
    setImportIssues([]);
    setPendingImportedQuestions([]);
    return true;
  }

  async function handleTemplateNext() {
    if (!templateId || !selectedTemplate) {
      toast.error(t("createExam.step2.templateRequired"));
      return;
    }
    if (watchedGradingType === "STUDENT_SUBMISSION" && !templateShape.hasStudentId) {
      toast.error(studentSubmissionTemplateError);
      return;
    }
    try {
      setIsSavingDraft(true);
      const saved = await ensureDraftExam();
      if (saved) setStep(3);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.finishFailed")));
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleCreateTemplateFromDesigner(draft: OMRTemplateDraft) {
    if (!newTemplateName.trim()) {
      toast.error(t("createExam.step2.nameRequired"));
      return;
    }

    try {
      setIsSavingTemplate(true);
      const created = await createTemplate({
        name: newTemplateName.trim(),
        anchor_points: draft.anchor_points,
        grid_config: draft.grid_config,
      });
      setTemplates((current) => [created, ...current]);
      setNewTemplateName("");
      if (selectTemplate(created)) {
        const saved = await ensureDraftExam(created);
        if (!saved) return;
        toast.success(t("createExam.step2.createdAndSelected"));
        setStep(3);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.templateCreateFailed")));
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function handleAnswerKeyNext() {
    if (versions.length > 0) {
      if (displayedQuestions.length !== templateShape.totalQuestions) {
        toast.error(t("createExam.step3.errors.questionCountMismatch", { count: templateShape.totalQuestions }));
        return;
      }
      setStep(4);
      return;
    }

    const error = validateQuestions(questions, templateShape.totalQuestions, templateShape.choicesPerQuestion);
    if (error) {
      toast.error(error);
      return;
    }
    setStep(4);
  }

  async function ensureDraftExam(templateOverride?: Template): Promise<Exam | null> {
    const generalIsValid = await form.trigger();
    if (!generalIsValid) {
      setStep(1);
      return null;
    }
    const activeTemplate = templateOverride ?? selectedTemplate;
    const activeTemplateId = activeTemplate?.id ?? templateId;
    const activeTemplateShape = getTemplateShape(activeTemplate);

    if (!activeTemplate || !activeTemplateId) {
      toast.error(t("createExam.step2.templateRequired"));
      setStep(2);
      return null;
    }

    const values = form.getValues();
    if (values.grading_type === "STUDENT_SUBMISSION" && !activeTemplateShape.hasStudentId) {
      toast.error(studentSubmissionTemplateError);
      setStep(2);
      return null;
    }

    const payload = {
      name: values.name,
      subject: values.subject,
      duration: values.duration,
      score_scale: values.score_scale,
      total_questions: activeTemplateShape.totalQuestions,
      template_id: activeTemplateId,
      class_ids: values.class_ids,
      identification_mode: values.identification_mode,
      exam_type: "paper" as const,
      grading_type: values.grading_type,
      start_time: values.grading_type === "STUDENT_SUBMISSION" ? new Date(values.start_time!).toISOString() : undefined,
      end_time: values.grading_type === "STUDENT_SUBMISSION" ? new Date(values.end_time!).toISOString() : undefined,
    };
    const currentId = examId ?? exam?.id;
    const saved = currentId ? await updateExam(currentId, payload) : await createExam(payload);
    if (currentId) {
      await ensureExamClassAssignments(saved.id, values);
    }
    setExam(saved);
    return saved;
  }

  async function ensureExamClassAssignments(targetExamId: string, values: GeneralValues) {
    if (values.class_ids.length === 0) return;

    const existingAssignments = await getExamAssignments(targetExamId);
    const existingClassIds = new Set(existingAssignments.map((assignment) => assignment.class_id));
    const missingClassIds = values.class_ids.filter((classId) => !existingClassIds.has(classId));
    if (missingClassIds.length === 0) return;

    const startTime =
      values.grading_type === "STUDENT_SUBMISSION" && values.start_time
        ? new Date(values.start_time)
        : new Date();
    const endTime =
      values.grading_type === "STUDENT_SUBMISSION" && values.end_time
        ? new Date(values.end_time)
        : new Date(startTime.getTime() + values.duration * 60_000);

    await createExamAssignments(targetExamId, {
      class_ids: missingClassIds,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });
  }

  async function refreshExamQuestions(targetExamId: string) {
    const loadedQuestions = await getExamQuestions(targetExamId);
    setQuestions(toQuestionDraftsFromQuestions(loadedQuestions, templateShape.totalQuestions, templateShape.choicesPerQuestion, true));
  }

  async function handleGenerateFromBank(ignoreWarnings = false) {
    if (!selectedBankId) {
      toast.error(t("createExam.step3.errors.bankRequired"));
      return;
    }
    if (versionCount < 1 || versionCount > 999) {
      toast.error(t("createExam.step3.errors.versionCountRange"));
      return;
    }
    if (!templateShape.isValid) {
      toast.error(t("createExam.step3.errors.templateInvalid"));
      return;
    }
    const configs =
      bankDistributionMode === "common"
        ? [{ versionCode: "all", ...commonDistribution }]
        : versionDistributions;
    const invalid = configs.find(
      (config) => config.easy + config.medium + config.hard !== templateShape.totalQuestions,
    );
    if (invalid) {
      toast.error(t("createExam.step3.errors.distributionMismatch", { code: invalid.versionCode, total: templateShape.totalQuestions }));
      return;
    }

    // Cảnh báo nếu ngân hàng không đủ câu theo độ khó
    if (bankWarnings.length > 0 && !ignoreWarnings) {
      setShowBankWarningDialog(true);
      return;
    }

    let savedExamId = "";

    try {
      console.info("[CreateExam] generateFromBank:start", {
        selectedBankId,
        versionCount,
        bankDistributionMode,
        commonDistribution,
        versionDistributions,
        topic: randomTopic.trim() || undefined,
      });
      setIsGeneratingQuestions(true);
      setShowBankWarningDialog(false);
      const saved = await ensureDraftExam();
      if (!saved) return;
      savedExamId = saved.id;
      console.info("[CreateExam] generateFromBank:examReady", { examId: saved.id });
      const topic = randomTopic.trim();
      const result = await generateExamVersionsFromBank(saved.id, {
        bankId: selectedBankId,
        versionCount: bankDistributionMode === "common" ? versionCount : undefined,
        difficultyDistribution: bankDistributionMode === "common" ? commonDistribution : undefined,
        versionConfigs: bankDistributionMode === "per_version" ? versionDistributions : undefined,
        topic: topic || undefined,
        shuffleMode: bankShuffleMode,
        shuffleQuestions: true,
      });
      console.info("[CreateExam] generateFromBank:result", {
        createdCount: result.created?.length ?? 0,
        warnings: result.warnings?.length ?? 0,
      });
      setVersions(result.created);
      setSelectedVersionId(result.created[0]?.id ?? "");
      setStep(4);
      // Refresh questions riêng, không chặn chuyển bước
      refreshExamQuestions(saved.id).catch(() => {
        toast.warning(t("createExam.toasts.questionsRefreshFailed"));
      });
      result.warnings.forEach((warning) => toast.warning(formatUserFacingMessage(warning)));
      toast.success(t("createExam.toasts.versionsGenerated"));
    } catch (error) {
      console.error("[CreateExam] generateFromBank:error", error);
      toast.error(getApiErrorMessage(error, t("createExam.toasts.bankGenerateFailed")));
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  function toggleQuickAnswerChoice(versionIndex: number, questionNumber: number, choice: string) {
    setQuickAnswerVersions((current) =>
      current.map((version, index) =>
        index === versionIndex
          ? (() => {
              const key = String(questionNumber);
              const selected = normalizeAnswerList(version.answerKey[key]);
              const next = selected.includes(choice)
                ? selected.filter((item) => item !== choice)
                : [...selected, choice].sort();
              const nextAnswerKey = { ...version.answerKey };

              if (next.length === 0) {
                delete nextAnswerKey[key];
              } else {
                nextAnswerKey[key] = next.length === 1 ? next[0] : next;
              }

              return {
                ...version,
                answerKey: nextAnswerKey,
              };
            })()
          : version,
      ),
    );
  }

  function addQuickAnswerVersion() {
    setQuickAnswerVersions((current) => [
      ...current,
      {
        versionCode: String(current.length + 1).padStart(3, "0"),
        answerKey: {},
      },
    ]);
  }

  function removeQuickAnswerVersion(index: number) {
    setQuickAnswerVersions((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function saveQuickAnswerVersions() {
    const invalid = quickAnswerVersions.find((version) => {
      if (!/^\d{3}$/.test(version.versionCode.trim())) return true;
      return Array.from({ length: templateShape.totalQuestions }, (_, index) => index + 1).some(
        (questionNumber) => !hasAnswerValue(version.answerKey[String(questionNumber)]),
      );
    });
    if (invalid) {
      toast.error(t("createExam.step3.errors.quickAnswerIncomplete"));
      return;
    }

    try {
      setIsSavingQuickAnswers(true);
      const saved = await ensureDraftExam();
      if (!saved) return;
      const result = await saveAnswerKeysByVersion(saved.id, {
        versions: quickAnswerVersions.map((version) => ({
          versionCode: version.versionCode.trim(),
          answerKey: version.answerKey,
        })),
      });
      await refreshExamQuestions(saved.id);
      setVersions(result.created);
      setSelectedVersionId(result.created[0]?.id ?? "");
      setStep(4);
      toast.success(t("createExam.toasts.quickAnswersSaved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.answerSaveFailed")));
    } finally {
      setIsSavingQuickAnswers(false);
    }
  }

  async function importQuickAnswerFile(file: File | undefined) {
    if (!file) return;
    try {
      setIsSavingQuickAnswers(true);
      const saved = await ensureDraftExam();
      if (!saved) return;
      const result = await importAnswerKeys(saved.id, file);
      await refreshExamQuestions(saved.id);
      setVersions(result.created);
      setSelectedVersionId(result.created[0]?.id ?? "");
      setStep(4);
      toast.success(t("createExam.toasts.answersImported"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.answerImportFailed")));
    } finally {
      setIsSavingQuickAnswers(false);
    }
  }

  async function handleResetGeneratedVersions() {
    const targetExamId = examId ?? exam?.id;
    if (!targetExamId) {
      setVersions([]);
      setQuestions([]);
      setSelectedVersionId("");
      setStep(3);
      return;
    }

    try {
      await deleteAllExamVersions(targetExamId);
      setVersions([]);
      setQuestions([]);
      setSelectedVersionId("");
      setStep(3);
      toast.success(t("createExam.toasts.oldVersionsDeleted"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.oldVersionsDeleteFailed")));
    }
  }

  async function handleCreateManualExamQuestions() {
    try {
      setIsGeneratingQuestions(true);
      const saved = await ensureDraftExam();
      if (!saved) return;
      await generateExamQuestions(saved.id, {
        count: templateShape.totalQuestions,
        manual: true,
      });
      await refreshExamQuestions(saved.id);
      setVersions([]);
      toast.success(t("createExam.toasts.manualQuestionsCreated"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.manualQuestionFailed")));
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  async function saveEditingQuestionSnapshot() {
    if (editingQuestionIndex === null) return;
    const question = questions[editingQuestionIndex];
    if (!question?.id) {
      toast.error(t("createExam.toasts.questionSaveFailed"));
      return;
    }

    try {
      setIsSavingSnapshot(true);
      await updateExamQuestionSnapshot(question.id, {
        snapshot: {
          content: question.content,
          options: question.options,
          correctAnswer: question.correctAnswer,
          correct_answer: question.correctAnswer,
        },
      });
      await refreshExamQuestions((examId ?? exam?.id)!);
      setEditingQuestionIndex(null);
      toast.success(t("createExam.step4.saved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.questionSaveFailed")));
    } finally {
      setIsSavingSnapshot(false);
    }
  }

  async function handleQuestionDrop(targetQuestionId: string | undefined) {
    if (!draggingQuestionId || !targetQuestionId || draggingQuestionId === targetQuestionId) {
      setDraggingQuestionId(null);
      return;
    }

    const currentOrder = selectedVersion?.question_order?.length
      ? selectedVersion.question_order
      : questions.map((question) => question.id).filter((id): id is string => Boolean(id));
    const fromIndex = currentOrder.indexOf(draggingQuestionId);
    const toIndex = currentOrder.indexOf(targetQuestionId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingQuestionId(null);
      return;
    }

    const nextOrder = [...currentOrder];
    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, moved);

    setVersions(
      versions.map((version) =>
        version.id === selectedVersion?.id ? { ...version, question_order: nextOrder } : version,
      ),
    );
    setDraggingQuestionId(null);

    const targetExamId = examId ?? exam?.id;
    if (!targetExamId) return;

    try {
      const reordered = await reorderExamQuestions(targetExamId, nextOrder, selectedVersion?.id);
      setQuestions(toQuestionDraftsFromQuestions(reordered, templateShape.totalQuestions, templateShape.choicesPerQuestion, true));
      const refreshedVersions = await getExamVersions(targetExamId);
      setVersions(refreshedVersions);
      if (selectedVersion?.id) setSelectedVersionId(selectedVersion.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.reorderFailed")));
    }
  }

  async function downloadQuestionImportTemplate() {
    if (examId) {
      try {
        const blob = await downloadQuestionTemplate(examId);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `mau-cau-hoi-${examId}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("createExam.import.downloadFailed")));
      }
    }

    const csv = buildQuestionTemplateCsv(templateShape.totalQuestions, templateShape.choicesPerQuestion);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mau-cau-hoi-${templateShape.totalQuestions}-cau.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleQuestionImportFile(file: File | undefined) {
    if (!file) return;

    try {
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        if (!templateShape.isValid) {
          setImportIssues([
            {
              row: 0,
              column: "Template",
              message: t("createExam.import.templateInvalidForExcel"),
            },
          ]);
          setPendingImportedQuestions([]);
          return;
        }

        const preview = examId
          ? await previewImportQuestionsExcel(examId, file)
          : await previewImportQuestionsExcelByShape({
              total_questions: templateShape.totalQuestions,
              choices_per_question: templateShape.choicesPerQuestion,
              file,
            });
        const importedQuestions = toQuestionDraftsFromInputs(
          preview.questions,
          preview.choices_per_question,
        );
        setImportIssues([]);
        setPendingImportedQuestions(importedQuestions);
        toast.success(t("createExam.toasts.importReadSuccess", { count: importedQuestions.length }));
        return;
      }

      const text = await file.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, ""));
      const result = validateImportedQuestions(
        rows,
        templateShape.totalQuestions,
        templateShape.choicesPerQuestion,
      );

      setImportIssues(result.issues);
      setPendingImportedQuestions(result.issues.length === 0 ? result.questions : []);

      if (result.issues.length > 0) {
        toast.error(t("createExam.toasts.importErrors", { count: result.issues.length }));
      } else {
        toast.success(t("createExam.toasts.importReadSuccess", { count: result.questions.length }));
      }
    } catch {
      setImportIssues([{ row: 0, column: "File", message: t("createExam.toasts.importReadFailed") }]);
      setPendingImportedQuestions([]);
      toast.error(t("createExam.toasts.importReadFailed"));
    }
  }

  function applyImportedQuestions() {
    if (pendingImportedQuestions.length !== templateShape.totalQuestions) return;
    setQuestions(pendingImportedQuestions);
    setPendingImportedQuestions([]);
    setImportIssues([]);
    toast.success(t("createExam.toasts.importApplied"));
  }

  async function downloadExamPackage() {
    const currentExamId = examId ?? exam?.id;
    if (!currentExamId) {
      toast.error(t("createExam.toasts.saveBeforeExport"));
      return;
    }

    try {
      const blob = await exportExamVersions(currentExamId, i18n.language);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${form.getValues("name") || "ky-thi"}-bo-de.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.exportFailed")));
    }
  }

  async function exportAllPdfsZip() {
    const currentExamId = examId ?? exam?.id;
    if (!currentExamId) {
      toast.error(t("createExam.toasts.saveBeforeExport"));
      return;
    }

    try {
      setIsExportingAll(true);
      const result = await exportAllExamPdfs(currentExamId, i18n.language);
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = result.filename;
      link.click();
      toast.success(t("createExam.toasts.exportAllZipCreated"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.exportAllFailed")));
    } finally {
      setIsExportingAll(false);
    }
  }

  async function finishFlow() {
    const generalIsValid = await form.trigger();
    if (!generalIsValid) {
      setStep(1);
      return;
    }

    if (!selectedTemplate || !templateId) {
      toast.error(t("createExam.toasts.templateNeeded"));
      setStep(2);
      return;
    }

    const values = form.getValues();
    if (values.grading_type === "STUDENT_SUBMISSION" && !templateShape.hasStudentId) {
      toast.error(studentSubmissionTemplateError);
      setStep(2);
      return;
    }

    if (versions.length === 0) {
      toast.error(t("createExam.toasts.versionsNeeded"));
      setStep(3);
      return;
    }

    const isEditing = Boolean(examId ?? exam?.id);
    try {
      setIsFinishing(true);
      const payload = {
        name: values.name,
        subject: values.subject,
        duration: values.duration,
        score_scale: values.score_scale,
        total_questions: templateShape.totalQuestions,
        template_id: templateId,
        answer_key: buildAnswerKey(questions),
        class_ids: values.class_ids,
        identification_mode: values.identification_mode,
        exam_type: "paper" as const,
        grading_type: values.grading_type,
        start_time: values.grading_type === "STUDENT_SUBMISSION" && values.start_time
          ? new Date(values.start_time).toISOString()
          : undefined,
        end_time: values.grading_type === "STUDENT_SUBMISSION" && values.end_time
          ? new Date(values.end_time).toISOString()
          : undefined,
      };

      const saved: Exam =
        isEditing ? await updateExam((examId ?? exam?.id)!, payload) : await createExam(payload);
      if (isEditing) {
        await ensureExamClassAssignments(saved.id, values);
      }

      setExam(saved);
      toast.success(examId ? t("createExam.toasts.updated") : t("createExam.toasts.created"));

      reset();
      if (onCompleted) {
        onCompleted();
        return;
      }
      // Navigate based on mode: back to detail if editing, to list if creating
      navigate(examId ? `/exams/${examId}` : "/exams", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("createExam.toasts.finishFailed")));
    } finally {
      setIsFinishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <button onClick={goBack} className="mb-4 inline-flex items-center gap-2 text-brand-soft-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            {t("createExam.backToList")}
          </button>
          <div className="mt-2">
            <h1 className="text-3xl font-semibold text-foreground">{examId ? t("createExam.editTitle") : t("createExam.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("createExam.subtitle")}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-0 sm:gap-0">
        {steps.map((item, index) => (
          <div key={item.number} className="flex items-start">
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${stepClass(step >= item.number)}`}>
                {item.number}
              </div>
              <span className="max-w-24 text-center text-xs leading-tight text-muted-foreground">{item.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-2 mt-4 h-1 w-10 rounded-full sm:w-14 lg:w-20 ${step > item.number ? "bg-blue-500" : "bg-blue-100"}`} />
            )}
          </div>
        ))}
      </div>

      <section className="min-w-0 rounded-md border bg-card">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{steps[step - 1]?.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`createExam.stepDescriptions.${step}`)}
            </p>
          </div>
          <Badge variant="outline">{t(identificationLabelKeys[identificationMode])}</Badge>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          {step === 1 && (
            <form className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exam-name">{t("createExam.step1.examName")}</Label>
                  <Input id="exam-name" className="focus-visible:ring-0" placeholder={t("createExam.step1.examNamePlaceholder")} {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-danger-foreground">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">{t("createExam.step1.subject")}</Label>
                  <Input id="subject" className="focus-visible:ring-0" placeholder={t("createExam.step1.subjectPlaceholder")} {...form.register("subject")} />
                  {form.formState.errors.subject && <p className="text-sm text-danger-foreground">{form.formState.errors.subject.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="duration">{t("createExam.step1.duration")}</Label>
                  <Input id="duration" className="focus-visible:ring-0" type="number" min={1} {...form.register("duration", { valueAsNumber: true })} />
                  {form.formState.errors.duration && <p className="text-sm text-danger-foreground">{form.formState.errors.duration.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score-scale">Thang điểm</Label>
                  <Input
                    id="score-scale"
                    className="focus-visible:ring-0"
                    type="number"
                    min={1}
                    max={100}
                    step="0.25"
                    {...form.register("score_scale", { valueAsNumber: true })}
                  />
                  {form.formState.errors.score_scale && <p className="text-sm text-danger-foreground">{form.formState.errors.score_scale.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t("createExam.step1.class")}</Label>
                  <Controller
                    control={form.control}
                    name="class_ids"
                    render={({ field }) => {
                      const selectedClasses = classes.filter((classItem) => field.value.includes(classItem.id));
                      const summary =
                        selectedClasses.length === 0
                          ? t("createExam.step1.class")
                          : selectedClasses.length === 1
                            ? `${selectedClasses[0].class_name} - ${selectedClasses[0].subject || t("createExam.step1.noSubject")}`
                            : t("createExam.step1.selectedClasses", { count: selectedClasses.length });

                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 w-full justify-between px-3 font-normal"
                            >
                              <span className="truncate text-left">{summary}</span>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="max-h-64 w-[--radix-popper-anchor-width] overflow-y-auto p-2">
                            {classes.length === 0 ? (
                              <div className="px-2 py-2 text-sm text-muted-foreground">{t("createExam.step1.noSubject")}</div>
                            ) : (
                              classes.map((classItem) => {
                                const checked = field.value.includes(classItem.id);
                                return (
                                  <label
                                    key={classItem.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) => {
                                        const isChecked = nextChecked === true;
                                        const nextValue = isChecked
                                          ? [...field.value, classItem.id]
                                          : field.value.filter((id) => id !== classItem.id);
                                        field.onChange(nextValue);
                                      }}
                                    />
                                    <span className="truncate">
                                      {classItem.class_name} - {classItem.subject || t("createExam.step1.noSubject")}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                  {form.formState.errors.class_ids && <p className="text-sm text-danger-foreground">{form.formState.errors.class_ids.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t("createExam.step1.identificationMode")}</Label>
                  <Controller
                    control={form.control}
                    name="identification_mode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">{t(identificationLabelKeys.internal)}</SelectItem>
                          <SelectItem value="external">{t(identificationLabelKeys.external)}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* ─── Grading Type ─────────────────────── */}
              <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <Label className="text-base font-semibold">{t("createExam.step1.examType")}</Label>
                <Controller
                  control={form.control}
                  name="grading_type"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col gap-3 sm:flex-row"
                    >
                      <label
                        htmlFor="grading-teacher"
                        className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 flex-1 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <RadioGroupItem value="TEACHER_GRADING" id="grading-teacher" className="mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-medium text-sm">
                            {t("createExam.step1.teacherGrading")}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("createExam.step1.teacherGradingDesc")}
                          </p>
                        </div>
                      </label>
                      <label
                        htmlFor="grading-student"
                        className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 flex-1 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <RadioGroupItem value="STUDENT_SUBMISSION" id="grading-student" className="mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-medium text-sm">
                            {t("createExam.step1.studentSubmission")}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t("createExam.step1.studentSubmissionDesc")}
                          </p>
                        </div>
                      </label>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* ─── Time fields (only for STUDENT_SUBMISSION) ─── */}
              {watchedGradingType === "STUDENT_SUBMISSION" && (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    {t("createExam.step1.timeWindowTitle")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">{t("createExam.step1.startTime")}</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        {...form.register("start_time")}
                        className="w-full focus-visible:ring-0"
                      />
                      {form.formState.errors.start_time && (
                        <p className="text-sm text-danger-foreground">{form.formState.errors.start_time.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">{t("createExam.step1.endTime")}</Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        {...form.register("end_time")}
                        className="w-full focus-visible:ring-0"
                      />
                      {form.formState.errors.end_time && (
                        <p className="text-sm text-danger-foreground">{form.formState.errors.end_time.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}

          {step === 2 && (
            <Tabs defaultValue="bank" className="space-y-4">
              <TabsList>
                <TabsTrigger value="bank">{t("createExam.step2.fromBank")}</TabsTrigger>
                <TabsTrigger value="designer">{t("createExam.step2.designNew")}</TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {selectedTemplate ? `Đang chọn: ${selectedTemplate.name}` : "Chưa chọn mẫu phiếu"}
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => void loadTemplates()} disabled={isLoadingTemplates}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingTemplates ? "animate-spin" : ""}`} />
                    Tải lại
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => {
                    const shape = getTemplateShape(template);
                    const selected = template.id === templateId;
                    const missingStudentId =
                      watchedGradingType === "STUDENT_SUBMISSION" && !shape.hasStudentId;
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition hover:border-blue-400 ${selected ? "border-primary ring-1 ring-primary" : ""} ${missingStudentId ? "border-amber-300" : ""}`}
                        onClick={() => selectTemplate(template)}
                      >
                        <CardHeader className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-soft text-brand-soft-foreground">
                                <FileText className="h-5 w-5" />
                              </div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                            </div>
                            {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          {missingStudentId && (
                            <Badge variant="outline" className="w-fit border-amber-300 text-amber-700">
                              Thiếu mã học sinh
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-md bg-muted/40 p-2">
                            <div className="text-muted-foreground">Câu</div>
                            <div className="font-semibold">{shape.totalQuestions}</div>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <div className="text-muted-foreground">Lựa chọn</div>
                            <div className="font-semibold">{shape.choicesPerQuestion}</div>
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <div className="text-muted-foreground">Vùng</div>
                            <div className="font-semibold">{template.grid_config.answer_zones.length}</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="designer" className="space-y-4">
                <div className="max-w-xl space-y-2">
                  <Label htmlFor="new-template-name">{t("createExam.step2.newTemplateName")}</Label>
                  <Input
                    id="new-template-name"
                    value={newTemplateName}
                    onChange={(event) => setNewTemplateName(event.target.value)}
                    placeholder={t("createExam.step2.newTemplateNamePlaceholder")}
                    className="focus-visible:ring-0"
                  />
                </div>
                <OMRTemplateDesigner
                  embedded
                  saveLabel={t("createExam.step2.saveAndUse")}
                  saving={isSavingTemplate}
                  onSave={handleCreateTemplateFromDesigner}
                />
              </TabsContent>
            </Tabs>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <div>
                  {t("createExam.step3.templateInfo", { name: selectedTemplate?.name })}
                </div>
                <div>
                  {t("createExam.step3.questionSummary", { questions: templateShape.totalQuestions, choices: templateShape.choicesPerQuestion })}
                </div>
              </div>

              <Tabs defaultValue="quick" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="quick">{t("createExam.step3.quickAnswers")}</TabsTrigger>
                  <TabsTrigger value="bank">{t("createExam.step3.fromBank")}</TabsTrigger>
                </TabsList>

                <TabsContent value="quick" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {t("createExam.step3.quickInstructions")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted/40">
                        <Upload className="h-4 w-4" />
                        {t("createExam.step3.importAnswerExcel")}
                        <Input
                          type="file"
                          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          className="hidden"
                          onChange={(event) => {
                            void importQuickAnswerFile(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </Label>
                      <Button type="button" variant="outline" onClick={addQuickAnswerVersion}>
                        {t("createExam.step3.addVersion")}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-[520px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 z-10 w-44 min-w-44 bg-card">{t("createExam.step3.versionCode")}</TableHead>
                          {Array.from({ length: templateShape.totalQuestions }, (_, index) => (
                            <TableHead key={index} className="min-w-36 text-center">
                              C{index + 1}
                            </TableHead>
                          ))}
                          <TableHead className="sticky right-0 z-10 w-24 bg-card">{t("createExam.step3.delete")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quickAnswerVersions.map((version, versionIndex) => (
                          <TableRow key={`${version.versionCode}-${versionIndex}`}>
                            <TableCell className="sticky left-0 z-10 w-44 min-w-44 bg-card">
                              <Input
                                value={version.versionCode}
                                maxLength={3}
                                className="h-10 min-w-32 font-mono text-base focus-visible:ring-0"
                                onChange={(event) =>
                                  setQuickAnswerVersions((current) =>
                                    current.map((item, index) =>
                                      index === versionIndex ? { ...item, versionCode: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </TableCell>
                            {Array.from({ length: templateShape.totalQuestions }, (_, index) => {
                              const questionNumber = index + 1;
                              const selectedAnswers = normalizeAnswerList(version.answerKey[String(questionNumber)]);
                              return (
                                <TableCell key={questionNumber} className="min-w-36">
                                  <div className="flex items-center justify-center gap-1">
                                    {choiceLabels.map((label) => {
                                      const selected = selectedAnswers.includes(label);
                                      return (
                                        <Button
                                          key={label}
                                          type="button"
                                          size="sm"
                                          variant={selected ? "default" : "outline"}
                                          className="h-8 w-8 px-0 font-semibold"
                                          aria-pressed={selected}
                                          onClick={() => toggleQuickAnswerChoice(versionIndex, questionNumber, label)}
                                        >
                                          {label}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell className="sticky right-0 z-10 bg-card">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={quickAnswerVersions.length <= 1}
                                onClick={() => removeQuickAnswerVersion(versionIndex)}
                              >
                                {t("createExam.step3.delete")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={isSavingQuickAnswers}
                      onClick={() => void saveQuickAnswerVersions()}
                    >
                      <Save className="h-4 w-4" />
                      {isSavingQuickAnswers ? t("createExam.step3.saving") : t("createExam.step3.saveAndGenerate")}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="bank" className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[1.3fr_220px_240px_220px]">
                <div className="space-y-2">
                  <Label>{t("createExam.step3.bankLabel")}</Label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger className="bg-card border-border/70 focus-visible:ring-0">
                      <SelectValue placeholder={t("createExam.step3.bankPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {questionBanks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name} ({bank.items_count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-version-count">{t("createExam.step3.versionCount")}</Label>
                  <Input
                    id="bank-version-count"
                    type="number"
                    min={1}
                    max={999}
                    className="bg-card border-border/70 focus-visible:ring-0"
                    value={versionCount}
                    onChange={(event) => setVersionCount(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("createExam.step3.shuffleMode")}</Label>
                  <Select
                    value={bankShuffleMode}
                    onValueChange={(value) => setBankShuffleMode(value as Extract<ShuffleMode, "questions" | "both">)}
                  >
                    <SelectTrigger className="bg-card border-border/70 focus-visible:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="questions">{t("createExam.step3.shuffleQuestionsOnly")}</SelectItem>
                      <SelectItem value="both">{t("createExam.step3.shuffleQuestionsAndChoices")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-topic">{t("createExam.step3.topic")}</Label>
                  <Input
                    id="bank-topic"
                    value={randomTopic}
                    onChange={(event) => setRandomTopic(event.target.value)}
                    placeholder={t("createExam.step3.topicPlaceholder")}
                    className="bg-card border-border/70 focus-visible:ring-0"
                  />
                </div>
              </div>

              {selectedBank && (
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border bg-muted/40 p-3">
                    <div className="text-sm text-muted-foreground">{t("createExam.step3.totalQs")}</div>
                    <div className="text-lg font-semibold">{selectedBank.items_count}</div>
                  </div>
                  {(["easy", "medium", "hard"] as const).map((level) => (
                    <div key={level} className="rounded-md border bg-muted/40 p-3">
                      <div className="text-sm text-muted-foreground">{level}</div>
                      <div className="text-lg font-semibold">{selectedBank.difficulty_counts[level]}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={bankDistributionMode === "common" ? "default" : "outline"}
                    onClick={() => setBankDistributionMode("common")}
                  >
                    {t("createExam.step3.commonAll")}
                  </Button>
                  <Button
                    type="button"
                    variant={bankDistributionMode === "per_version" ? "default" : "outline"}
                    onClick={() => setBankDistributionMode("per_version")}
                  >
                    {t("createExam.step3.perVersion")}
                  </Button>
                </div>

                {bankDistributionMode === "common" ? (
                  <div className="grid gap-3 md:grid-cols-4">
                    {(["easy", "medium", "hard"] as const).map((level) => (
                      <div key={level} className="space-y-2">
                        <Label>{level}</Label>
                        <Input
                          type="number"
                          min={0}
                          className="bg-card border-border/70 focus-visible:ring-0"
                          value={commonDistribution[level]}
                          onChange={(event) =>
                            setCommonDistribution((current) => ({
                              ...current,
                              [level]: Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label>{t("createExam.step3.total")}</Label>
                      <Input
                        className={`${distributionErrors.length > 0 ? "border-red-500" : "border-green-500"} bg-card focus-visible:ring-0`}
                        value={commonDistribution.easy + commonDistribution.medium + commonDistribution.hard}
                        readOnly
                      />
                    </div>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("createExam.step3.versionCode")}</TableHead>
                          <TableHead>easy</TableHead>
                          <TableHead>medium</TableHead>
                          <TableHead>hard</TableHead>
                          <TableHead>{t("createExam.step3.total")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versionDistributions.map((config, index) => (
                          <TableRow key={config.versionCode}>
                            <TableCell className="font-mono">{config.versionCode}</TableCell>
                            {(["easy", "medium", "hard"] as const).map((level) => (
                              <TableCell key={level}>
                                <Input
                                  type="number"
                                  min={0}
                                  className="bg-card border-border/70 focus-visible:ring-0"
                                  value={config[level]}
                                  onChange={(event) =>
                                    setVersionDistributions((current) =>
                                      current.map((item, currentIndex) =>
                                        currentIndex === index
                                          ? { ...item, [level]: Number(event.target.value) }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </TableCell>
                            ))}
                            <TableCell className={config.easy + config.medium + config.hard === templateShape.totalQuestions ? "text-green-700" : "text-danger-foreground"}>
                              {config.easy + config.medium + config.hard}/{templateShape.totalQuestions}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {distributionErrors.length > 0 && (
                <div className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-foreground">
                  {distributionErrors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              )}

              {bankWarnings.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {bankWarnings.map((warning) => (
                    <div key={warning}>{warning}. {t("createExam.step3.errors.bankTemporaryQuestion")}</div>
                  ))}
                </div>
              )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={!canGenerateFromBank || isGeneratingQuestions}
                      onClick={() => void handleGenerateFromBank()}
                    >
                      <RefreshCw className={`h-4 w-4 ${isGeneratingQuestions ? "animate-spin" : ""}`} />
                      {isGeneratingQuestions ? t("createExam.step3.generating") : t("createExam.step3.generate")}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-foreground">{t("createExam.step4.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("createExam.step4.subtitle")}
                  </p>
                </div>
                {(examId || exam) && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="gap-2" onClick={() => void handleResetGeneratedVersions()}>
                      <RefreshCw className="h-4 w-4" />
                      {t("createExam.step4.regenerate")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={isExportingAll}
                      onClick={() => void exportAllPdfsZip()}
                    >
                      <Download className="h-4 w-4" />
                      {isExportingAll ? t("createExam.step4.exporting") : t("createExam.step4.exportAllZip")}
                    </Button>
                  </div>
                )}
              </div>

              {versions.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {t("createExam.step4.noVersions")}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {versions.map((version) => (
                      <Button
                        key={version.id}
                        type="button"
                        variant={selectedVersion?.id === version.id ? "default" : "outline"}
                        onClick={() => setSelectedVersionId(version.id)}
                      >
                        {t("createExam.step4.versionBtn", { code: version.version_code })}
                      </Button>
                    ))}
                  </div>

                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[90px]">{t("createExam.step4.table.index")}</TableHead>
                          <TableHead>{t("createExam.step4.table.content")}</TableHead>
                          <TableHead className="w-[170px]">{t("createExam.step4.table.answerDifficulty")}</TableHead>
                          <TableHead className="w-[120px]">{t("createExam.step4.table.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedQuestions.map((question, index) => {
                          const isPlaceholder = !question.question_bank_item_id && !hasRichTextContent(question.content);
                          return (
                            <TableRow
                              key={question.id ?? index}
                              draggable={Boolean(question.id)}
                              className={draggingQuestionId === question.id ? "opacity-50" : ""}
                              onDragStart={() => setDraggingQuestionId(question.id ?? null)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => void handleQuestionDrop(question.id)}
                            >
                              <TableCell className="align-top">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                                  <span className="font-medium">{index + 1}</span>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                {isPlaceholder && (
                                  <Badge variant="destructive" className="mb-2">
                                    {t("createExam.step4.noQuestion")}
                                  </Badge>
                                )}
                                <MathJaxContent html={question.content || "<p>_____</p>"} className="prose max-w-none text-sm" />
                                <div className="mt-3 grid gap-2 md:grid-cols-2">
                                  {question.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="rounded-md border bg-card p-2 text-sm">
                                      <span className="font-semibold">{choiceLabels[optionIndex]}.</span>{" "}
                                      <MathJaxContent html={option || "<em>_____</em>"} className="inline" />
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <Badge variant="outline">{t("createExam.step4.answer", { ans: normalizeAnswer(question.correctAnswer) || "-" })}</Badge>
                                {question.difficulty && <div className="mt-2 text-xs text-muted-foreground">{t("createExam.step4.difficulty", { level: question.difficulty })}</div>}
                                {question.topic && <div className="mt-1 text-xs text-muted-foreground">{t("createExam.step4.topic", { name: question.topic })}</div>}
                              </TableCell>
                              <TableCell className="align-top">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() =>
                                    setEditingQuestionIndex(
                                      Math.max(0, questions.findIndex((item) => item.id === question.id)),
                                    )
                                  }
                                >
                                  <Edit3 className="h-4 w-4" />
                                  {t("createExam.step4.editCommon")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}

          <Dialog open={editingQuestionIndex !== null} onOpenChange={(open) => !open && setEditingQuestionIndex(null)}>
            <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-[100dvw] max-w-none flex-col overflow-hidden rounded-none p-0">
              <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
                <DialogTitle>{t("createExam.step4.editDialogTitle")}</DialogTitle>
              </DialogHeader>
              {editingQuestionIndex !== null && questions[editingQuestionIndex] && (
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {t("createExam.step4.editDialogNote")}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("createExam.step4.editDialogContent")}</Label>
                    <RichTextEditor
                      value={questions[editingQuestionIndex].content}
                      onChange={(value) => updateQuestion(editingQuestionIndex, { content: value })}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {choiceLabels.map((label, optionIndex) => (
                      <div key={label} className="space-y-2">
                        <Label>{t("createExam.step4.editDialogChoice", { label })}</Label>
                        <RichTextEditor
                          minHeight={130}
                          value={questions[editingQuestionIndex].options[optionIndex] ?? ""}
                          onChange={(value) => {
                            const nextOptions = [...questions[editingQuestionIndex].options];
                            nextOptions[optionIndex] = value;
                            updateQuestion(editingQuestionIndex, { options: nextOptions });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("createExam.step4.editDialogAnswer")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {choiceLabels.map((label) => {
                        const selectedAnswers = normalizeAnswerList(questions[editingQuestionIndex].correctAnswer);
                        const checked = selectedAnswers.includes(label);
                        return (
                          <label
                            key={label}
                            className={`flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:bg-muted"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              className="sr-only"
                              onCheckedChange={(nextChecked) => {
                                const nextAnswers = nextChecked
                                  ? [...selectedAnswers, label]
                                  : selectedAnswers.filter((answer) => answer !== label);
                                updateQuestion(editingQuestionIndex, {
                                  correctAnswer: nextAnswers.length <= 1 ? nextAnswers[0] ?? "" : nextAnswers,
                                });
                              }}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="shrink-0 border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setEditingQuestionIndex(null)}>
                  {t("createExam.step4.editDialogCancel")}
                </Button>
                <Button type="button" disabled={isSavingSnapshot} onClick={() => void saveEditingQuestionSnapshot()}>
                  {isSavingSnapshot ? t("createExam.step4.editDialogSaving") : t("createExam.step4.editDialogSave")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showBankWarningDialog} onOpenChange={setShowBankWarningDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("createExam.step3.errors.bankWarningTitle", { defaultValue: "Ngân hàng câu hỏi chưa đủ" })}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t("createExam.step3.errors.bankInsufficient")}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {bankWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <p>{t("createExam.step3.errors.bankWarningContinue")}</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowBankWarningDialog(false)}>
                  {t("common.cancel", { defaultValue: "Hủy" })}
                </Button>
                <Button type="button" onClick={() => void handleGenerateFromBank(true)} disabled={isGeneratingQuestions}>
                  {isGeneratingQuestions ? t("createExam.step3.generating") : t("common.continue", { defaultValue: "Tiếp tục" })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={step === 1 || isLoading || isFinishing}
              onClick={() => setStep(Math.max(1, step - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("createExam.navigation.back")}
            </Button>

            {step === 1 && (
              <Button type="button" variant="info" className="gap-2" disabled={isLoading} onClick={() => void handleStepOneNext()}>
                {t("createExam.navigation.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button type="button" variant="info" className="gap-2" disabled={isSavingDraft} onClick={() => void handleTemplateNext()}>
                {t("createExam.navigation.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === 4 && (
              <Button type="button" variant="success" className="gap-2" disabled={isFinishing} onClick={() => void finishFlow()}>
                <Save className="h-4 w-4" />
                {isFinishing ? t("createExam.navigation.finishing") : t("createExam.navigation.finish")}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
