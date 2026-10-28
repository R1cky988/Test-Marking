import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  FileText,
  Hash,
  Info,
  Layers,
  LayoutGrid,
  MessageSquare,
  RefreshCw,
  Settings2,
  Shuffle,
  Tag,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import type { AnswerKeyValue, Exam, ExamAssignment, ExamStatus, ExamType, GradingType, ExamVersion, IdentificationMode } from "@/types/academic.types";
import { getExamAssignments, getExamVersions } from "../exams.api";

// ─── Outlet context (từ ExamDetailLayout) ────────────────────────

interface ExamDetailContext {
  exam: Exam | null;
  isLoading: boolean;
  onRefresh: () => void;
}

// ─── Label helpers ────────────────────────────────────────────────

const STATUS_CONFIG: Record<ExamStatus, { label: string; className: string }> = {
  draft: { label: "examStatus.draft", className: "bg-muted text-foreground/80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  ready: { label: "examStatus.ready", className: "bg-brand-soft text-brand-soft-foreground" },
  scheduled: { label: "examStatus.scheduled", className: "bg-info-soft text-info-foreground" },
  active: { label: "examStatus.active", className: "bg-success-soft text-success-foreground" },
  end: { label: "examStatus.end", className: "bg-amber-100 text-amber-800" },
  closed: { label: "examStatus.closed", className: "bg-muted text-foreground dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  paper: "exams.type.paper",
  online: "exams.type.online",
  hybrid: "exams.type.hybrid",
};

const GRADING_TYPE_LABEL: Record<GradingType, string> = {
  TEACHER_GRADING: "exams.grading.teacherDetail",
  STUDENT_SUBMISSION: "exams.grading.studentDetail",
};

const IDENTIFICATION_LABEL: Record<IdentificationMode, string> = {
  internal: "exams.identificationDetail.internal",
  external: "exams.identificationDetail.external",
};

const SHUFFLE_LABEL: Record<string, string> = {
  none: "exams.shuffle.none",
  questions: "exams.shuffle.questions",
  choices: "exams.shuffle.choices",
  both: "exams.shuffle.both",
};

function formatDate(val: string | null | undefined, locale: string) {
  if (!val) return "—";
  return new Date(val).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────

function normalizeAnswerList(value: AnswerKeyValue | null | undefined) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function InfoRow({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-40 rounded" />
        ) : (
          <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
        )}
      </div>
    </div>
  );
}

// ─── ExamInfoTab ──────────────────────────────────────────────────

export function ExamInfoTab() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { exam, isLoading } = useOutletContext<ExamDetailContext>();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";

  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [selectedAnswerVersionId, setSelectedAnswerVersionId] = useState<string | null>(null);
  const [selectedAnswerVersionCode, setSelectedAnswerVersionCode] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const configExamId = exam?.parent_exam_id ?? examId ?? "";
  const isInstanceExam = Boolean(exam?.parent_exam_id);
  const instanceCount = exam?.instances?.length ?? 0;
  const isMultiGroupExam = Boolean(exam && !exam.parent_exam_id && instanceCount > 1);
  const isOperationalExam = Boolean(exam?.parent_exam_id) || Boolean(exam?.class_id && !isMultiGroupExam);
  const canEditConfig = Boolean(
    exam &&
      !exam.parent_exam_id &&
      (exam.status === "draft" || exam.status === "ready" || exam.status === "scheduled"),
  );
  const assignedClasses = useMemo(() => {
    if (isInstanceExam && exam?.class_id) {
      return [
        {
          id: exam.class_id,
          name: exam.class?.class_name || exam.class_id,
          code: exam.class?.class_code ?? null,
        },
      ];
    }

    const fromAssignments = assignments.map((assignment) => ({
      id: assignment.class_id,
      name: assignment.class?.class_name || assignment.class_id,
      code: assignment.class?.class_code ?? null,
    }));
    if (fromAssignments.length > 0) return fromAssignments;

    return (exam?.instances ?? [])
      .filter((instance) => Boolean(instance.class_id))
      .map((instance) => ({
        id: instance.class_id!,
        name: instance.class?.class_name || instance.class_id!,
        code: instance.class?.class_code ?? null,
      }));
  }, [assignments, exam, isInstanceExam]);

  // Load danh sách mã đề
  useEffect(() => {
    if (!configExamId) return;
    setVersionsLoading(true);
    getExamVersions(configExamId)
      .then(setVersions)
      .catch((err) => {
        // Không show error khi chưa có mã đề
        if (!String(err).includes("404")) {
          toast.error(getApiErrorMessage(err, t("exams.errors.loadVersions")));
        }
      })
      .finally(() => setVersionsLoading(false));
  }, [configExamId, t]);

  useEffect(() => {
    if (versions.length === 0) {
      setSelectedAnswerVersionId(null);
      setSelectedAnswerVersionCode(null);
      return;
    }

    const selectedById = versions.find((version) => version.id === selectedAnswerVersionId);
    if (selectedById) {
      if (selectedAnswerVersionCode !== selectedById.version_code) {
        setSelectedAnswerVersionCode(selectedById.version_code);
      }
      return;
    }

    const selectedByCode = versions.find((version) => version.version_code === selectedAnswerVersionCode);
    const nextSelected = selectedByCode ?? versions[0];
    setSelectedAnswerVersionId(nextSelected.id);
    setSelectedAnswerVersionCode(nextSelected.version_code);
  }, [selectedAnswerVersionCode, selectedAnswerVersionId, versions]);

  useEffect(() => {
    if (!examId || isInstanceExam) {
      setAssignments([]);
      setAssignmentsLoading(false);
      return;
    }
    setAssignmentsLoading(true);
    getExamAssignments(examId)
      .then(setAssignments)
      .catch((err) => {
        toast.error(getApiErrorMessage(err, t("exams.errors.loadAssignments")));
      })
      .finally(() => setAssignmentsLoading(false));
  }, [examId, isInstanceExam, t]);

  const status = exam?.status;
  const statusCfg = status ? STATUS_CONFIG[status] : null;
  const selectedAnswerVersion = useMemo(
    () =>
      versions.find((version) => version.id === selectedAnswerVersionId) ??
      versions.find((version) => version.version_code === selectedAnswerVersionCode) ??
      versions[0] ??
      null,
    [selectedAnswerVersionCode, selectedAnswerVersionId, versions],
  );
  const answerRows = useMemo(() => {
    const answerKey = selectedAnswerVersion?.answer_key ?? {};
    const totalQuestions = Math.max(
      exam?.total_questions ?? 0,
      ...Object.keys(answerKey)
        .map((key) => Number.parseInt(key, 10))
        .filter((value) => Number.isInteger(value) && value > 0),
    );

    return Array.from({ length: totalQuestions }, (_, index) => {
      const questionNumber = index + 1;
      const answers = normalizeAnswerList(answerKey[String(questionNumber)]);
      return {
        questionNumber,
        answers,
        hasAnswer: answers.length > 0,
      };
    });
  }, [exam?.total_questions, selectedAnswerVersion]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* ── Cột trái: Thông tin chi tiết ──────────────────── */}
      <div className="space-y-5 lg:col-span-2">
        {/* Thông tin cơ bản */}
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Info className="h-4 w-4" />
              {t("exams.info.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 divide-y divide-border/40">
            <InfoRow
              icon={<BookOpen className="h-4 w-4" />}
              label={t("exams.info.name")}
              value={isLoading ? undefined : (exam?.name ?? "—")}
              loading={isLoading}
            />
            <InfoRow
              icon={<Tag className="h-4 w-4" />}
              label={t("exams.info.subject")}
              value={isLoading ? undefined : (exam?.subject ?? "—")}
              loading={isLoading}
            />
            <InfoRow
              icon={<Hash className="h-4 w-4" />}
              label={t("exams.info.totalQuestions")}
              value={
                isLoading ? undefined : (
                  <span>
                    {t("exams.info.totalQuestionsValue", { count: exam?.total_questions ?? 0 })}
                  </span>
                )
              }
              loading={isLoading}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label={t("exams.info.duration")}
              value={
                isLoading ? undefined : (
                  <span>
                    {t("exams.info.durationValue", { duration: exam?.duration ?? 0 })}
                  </span>
                )
              }
              loading={isLoading}
            />
            <InfoRow
              icon={<Layers className="h-4 w-4" />}
              label={t("exams.info.examType")}
              value={
                isLoading ? undefined : exam?.exam_type
                  ? t(EXAM_TYPE_LABEL[exam.exam_type])
                  : "—"
              }
              loading={isLoading}
            />
            <InfoRow
              icon={<ClipboardList className="h-4 w-4" />}
              label={t("exams.info.gradingType")}
              value={
                isLoading ? undefined : (
                  <span>
                    {exam?.grading_type ? t(GRADING_TYPE_LABEL[exam.grading_type]) : "—"}
                  </span>
                )
              }
              loading={isLoading}
            />
            {exam?.grading_type === "STUDENT_SUBMISSION" && (
              <>
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label={t("exams.info.startTime")}
                  value={isLoading ? undefined : formatDate(exam?.start_time, locale)}
                  loading={isLoading}
                />
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label={t("exams.info.endTime")}
                  value={isLoading ? undefined : formatDate(exam?.end_time, locale)}
                  loading={isLoading}
                />
              </>
            )}
            <InfoRow
              icon={<Settings2 className="h-4 w-4" />}
              label={t("exams.info.identification")}
              value={
                isLoading ? undefined : exam?.identification_mode
                  ? t(IDENTIFICATION_LABEL[exam.identification_mode])
                  : "—"
              }
              loading={isLoading}
            />
            <InfoRow
              icon={<Users className="h-4 w-4" />}
              label={t("exams.info.assignedClasses")}
              value={
                assignmentsLoading ? undefined : assignedClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedClasses.map((classInfo) => {
                      return (
                        <Link
                          key={classInfo.id}
                          to={`/classes/${classInfo.id}`}
                          state={{ from: location.pathname }}
                          className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {classInfo.code && (
                            <span className="font-mono text-muted-foreground">{classInfo.code}</span>
                          )}
                          <span>{classInfo.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  "—"
                )
              }
              loading={assignmentsLoading}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label={t("exams.info.createdAt")}
              value={isLoading ? undefined : formatDate(exam?.created_at, locale)}
              loading={isLoading}
            />
            <InfoRow
              icon={<RefreshCw className="h-4 w-4" />}
              label={t("exams.info.updatedAt")}
              value={isLoading ? undefined : formatDate(exam?.updated_at, locale)}
              loading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Danh sách mã đề */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Shuffle className="h-4 w-4" />
                {t("exams.versions.title")}
              </CardTitle>
              {canEditConfig && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  asChild
                >
                  <Link to={`/exams/${configExamId}/edit?step=3`}>
                    <Edit3 className="h-3.5 w-3.5" />
                    {t("exams.versions.manage")}
                  </Link>
                </Button>
              )}
            </div>
            <CardDescription>
              {versionsLoading
                ? t("exams.versions.loading")
                : versions.length > 0
                  ? t("exams.versions.count", { count: versions.length })
                  : t("exams.versions.emptyHint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {versionsLoading ? (
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-md" />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 py-8 text-center">
                <LayoutGrid className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("exams.versions.empty")}</p>
                {canEditConfig && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="mt-1 h-7 text-xs"
                  >
                    <Link to={`/exams/${configExamId}/edit?step=3`}>
                      {t("exams.versions.generateNow")}
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {versions.map((v) => {
                    const selected = selectedAnswerVersion?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className={`group flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono font-semibold transition-colors ${
                          selected
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/50 bg-muted/40 text-foreground hover:bg-muted"
                        }`}
                        title={t("exams.versions.shuffleTitle", {
                          mode: t(SHUFFLE_LABEL[v.shuffle_mode] ?? v.shuffle_mode),
                        })}
                        onClick={() => {
                          setSelectedAnswerVersionId(v.id);
                          setSelectedAnswerVersionCode(v.version_code);
                        }}
                      >
                        <span>{v.version_code}</span>
                        {v.shuffle_mode !== "none" && (
                          <Shuffle className="h-3 w-3 text-muted-foreground/60" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedAnswerVersion && (
                  <div className="rounded-md border border-border/60 bg-background">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("exams.answerKey.title")}
                        </p>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {selectedAnswerVersion.version_code}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-normal">
                        {t(SHUFFLE_LABEL[selectedAnswerVersion.shuffle_mode] ?? selectedAnswerVersion.shuffle_mode)}
                      </Badge>
                    </div>
                    {answerRows.length > 0 ? (
                      <div className="grid grid-cols-2 gap-px bg-border/60 text-sm sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                        {answerRows.map((row) => (
                          <div
                            key={row.questionNumber}
                            className="flex min-h-9 items-center justify-between gap-2 bg-card px-3 py-2"
                          >
                            <span className="text-xs text-muted-foreground">
                              {t("exams.answerKey.question", { number: row.questionNumber })}
                            </span>
                            {row.hasAnswer ? (
                              <span className="flex flex-wrap justify-end gap-1">
                                {row.answers.map((answer) => (
                                  <Badge
                                    key={`${row.questionNumber}-${answer}`}
                                    variant="secondary"
                                    className="h-5 rounded px-1.5 font-mono text-[11px] font-semibold"
                                  >
                                    {answer}
                                  </Badge>
                                ))}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">
                                {t("exams.answerKey.missing")}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-3 py-4 text-sm text-muted-foreground">
                        {t("exams.answerKey.empty")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Cột phải: Trạng thái + Quick actions ──────────── */}
      <div className="space-y-5">
        {/* Status card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <CheckCircle2 className="h-4 w-4" />
              {t("exams.status.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {isLoading ? (
              <Skeleton className="h-8 w-32 rounded" />
            ) : statusCfg ? (
              <div className="space-y-3">
                <Badge className={`${statusCfg.className} hover:${statusCfg.className} text-sm px-3 py-1`}>
                  {t(statusCfg.label)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {status && t(`exams.status.help.${status}`)}
                </p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        {/* Template card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <FileText className="h-4 w-4" />
              {t("exams.template.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {isLoading ? (
              <Skeleton className="h-6 w-40 rounded" />
            ) : exam?.template ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {exam.template.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("exams.template.version", {
                    version: exam.template.version,
                    type: exam.template.template_type,
                  })}
                </p>
                {exam.template.preview_image_url && (
                  <img
                    src={resolveServerImageUrl(exam.template.preview_image_url)}
                    alt={t("exams.template.previewAlt")}
                    className="mt-2 w-full rounded-md border border-border/40 object-contain"
                    style={{ maxHeight: 120 }}
                  />
                )}
                {canEditConfig && exam.template_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="mt-1 h-7 w-full gap-1.5 text-xs"
                  >
                    <Link to={`/templates/${exam.template_id}/edit`}>
                      <Edit3 className="h-3.5 w-3.5" />
                      {t("exams.template.openDesigner")}
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("exams.template.unassigned")}</p>
                {canEditConfig && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-7 w-full text-xs"
                  >
                    <Link to={`/exams/${configExamId}/edit?step=2`}>
                      {t("exams.template.choose")}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Settings2 className="h-4 w-4" />
              {t("exams.quick.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 px-5 pb-5">
            {canEditConfig && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => navigate(`/exams/${configExamId}/edit`)}
                id="quick-edit"
              >
                <Edit3 className="h-4 w-4 text-muted-foreground" />
                {t("exams.quick.edit")}
              </Button>
            )}
            {canEditConfig && isOperationalExam && <Separator className="my-0.5" />}
            {isOperationalExam ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => navigate(`/exams/${examId ?? ""}/results`)}
                  id="quick-results"
                >
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  {t("exams.quick.results")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-sm"
                  onClick={() => navigate(`/exams/${examId ?? ""}/statistics`)}
                  id="quick-statistics"
                >
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  {t("exams.quick.statistics")}
                </Button>
              </>
            ) : (
              <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Chọn một lớp trong danh sách kỳ thi để xem điểm và thống kê theo lớp.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
