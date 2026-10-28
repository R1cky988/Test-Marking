import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ClipboardList,
  Clock,
  Download,
  ShieldAlert,
  Info,
  Lock,
  MessageSquare,
  Play,
  Loader2,
  Settings,
  StopCircle,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { Exam, ExamStatus, GradingType } from "@/types/academic.types";
import { exportAllExamPdfs, getExam, publishExam, updateExamStatus } from "../exams.api";

function statusBadge(status: ExamStatus, t: (key: string, options?: Record<string, unknown>) => string) {
  const config: Record<ExamStatus, string> = {
    draft: "bg-muted text-foreground/80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    ready: "bg-brand-soft text-brand-soft-foreground",
    scheduled: "bg-info-soft text-info-foreground",
    active: "bg-success-soft text-success-foreground",
    end: "bg-amber-100 text-amber-800",
    closed: "bg-muted text-foreground dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return <Badge className={`${config[status]} hover:${config[status]}`}>{t(`examStatus.${status}`)}</Badge>;
}

function gradingTypeBadge(type: GradingType, t: (key: string) => string) {
  const config: Record<GradingType, { label: string; className: string }> = {
    TEACHER_GRADING: { label: "exams.grading.teacher", className: "bg-info-soft text-info-foreground hover:bg-info-soft/80" },
    STUDENT_SUBMISSION: { label: "exams.grading.student", className: "bg-warning-soft text-warning-foreground hover:bg-warning-soft/80" },
  };
  const cfg = config[type] ?? config.TEACHER_GRADING;
  return <Badge className={cfg.className}>{t(cfg.label)}</Badge>;
}

function getEffectiveExamStatus(exam: Exam): ExamStatus {
  if (exam.grading_type !== "STUDENT_SUBMISSION") return exam.status;
  if (exam.status !== "scheduled" && exam.status !== "active") return exam.status;
  if (!exam.start_time || !exam.end_time) return exam.status;

  const now = Date.now();
  const start = new Date(exam.start_time).getTime();
  const end = new Date(exam.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return exam.status;
  if (now >= end) return "end";
  if (now >= start) return "active";
  return "scheduled";
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TabDef {
  label: string;
  segment: string;
  icon: React.ReactNode;
}

export function ExamDetailLayout() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const { id: examId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const backTarget = (location.state as { from?: string } | null)?.from;

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const effectiveStatus = exam ? getEffectiveExamStatus(exam) : null;
  const instanceCount = exam?.instances?.length ?? 0;
  const isMultiGroupExam = Boolean(exam && !exam.parent_exam_id && instanceCount > 1);
  const isOperationalExam = Boolean(exam?.parent_exam_id) || Boolean(exam?.class_id && !isMultiGroupExam);
  const configExamId = exam?.parent_exam_id ?? examId ?? "";
  const canEditConfig = Boolean(
    exam &&
      !exam.parent_exam_id &&
      (exam.status === "draft" || exam.status === "ready" || effectiveStatus === "scheduled"),
  );
  const canEndExam = Boolean(
    exam &&
      exam.grading_type === "STUDENT_SUBMISSION" &&
      effectiveStatus === "active",
  );
  const canCloseExam = Boolean(
    exam &&
      exam.status !== "closed" &&
      (exam.grading_type === "STUDENT_SUBMISSION"
        ? effectiveStatus === "end"
        : effectiveStatus === "active"),
  );

  const tabs = useMemo<TabDef[]>(
    () =>
      isOperationalExam
        ? [
            { label: t("exams.tabs.info"), segment: "info", icon: <Info className="h-4 w-4" /> },
            { label: t("exams.tabs.participants", { defaultValue: "Học sinh" }), segment: "participants", icon: <Users className="h-4 w-4" /> },
            { label: t("exams.tabs.results"), segment: "results", icon: <ClipboardList className="h-4 w-4" /> },
            { label: t("exams.tabs.statistics"), segment: "statistics", icon: <BarChart3 className="h-4 w-4" /> },
            { label: t("exams.tabs.violations", { defaultValue: "Vi phạm" }), segment: "violations", icon: <ShieldAlert className="h-4 w-4" /> },
          ]
        : [{ label: t("exams.tabs.info"), segment: "info", icon: <Info className="h-4 w-4" /> }],
    [isOperationalExam, t],
  );

  const loadExam = useCallback(async (options: { background?: boolean } = {}) => {
    if (!examId) return;
    try {
      if (!options.background) setIsLoading(true);
      const data = await getExam(examId);
      setExam(data);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        toast.error(t("exams.errors.notFound", { defaultValue: "Kỳ thi không tồn tại hoặc đã bị xóa." }));
        navigate(backTarget || "/exams", { replace: true });
        return;
      }
      toast.error(getApiErrorMessage(err, t("exams.errors.load")));
    } finally {
      if (!options.background) setIsLoading(false);
    }
  }, [backTarget, examId, navigate, t]);

  useEffect(() => {
    void loadExam();
  }, [loadExam]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadExam({ background: true });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadExam]);

  useEffect(() => {
    if (!exam || exam.grading_type !== "STUDENT_SUBMISSION" || !exam.end_time) {
      setCountdown("");
      return;
    }

    function updateCountdown() {
      const now = Date.now();
      const end = new Date(exam.end_time!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown(t("exams.timeExpired"));
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [exam, t]);

  const activeSegment = (() => {
    const parts = location.pathname.split("/");
    const afterId = parts.slice(3).join("/");
    if (!afterId) return "info";
    return afterId.split("/")[0];
  })();

  useEffect(() => {
    if (!exam || isOperationalExam || activeSegment === "info") return;
    navigate(`/exams/${exam.id}/info`, {
      replace: true,
      state: { from: backTarget || "/exams" },
    });
  }, [activeSegment, backTarget, exam, isOperationalExam, navigate]);

  const handlePublish = async () => {
    if (!examId || isPublishing) return;
    try {
      setIsPublishing(true);
      if (exam?.status === "scheduled") {
        await updateExamStatus(examId, "ACTIVE");
      } else {
        await publishExam(examId);
      }
      toast.success(t("exams.actions.publishSuccess"));
      setShowPublishConfirm(false);
      await loadExam();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("exams.errors.publish")));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = async () => {
    if (!examId || isClosing) return;
    try {
      setIsClosing(true);
      await updateExamStatus(examId, "CLOSED");
      toast.success(t("exams.actions.closeSuccess"));
      setShowCloseConfirm(false);
      await loadExam();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("exams.errors.close")));
    } finally {
      setIsClosing(false);
    }
  };

  const handleEnd = async () => {
    if (!examId || isEnding) return;
    try {
      setIsEnding(true);
      await updateExamStatus(examId, "END");
      toast.success(t("exams.actions.endEarlySuccess"));
      setShowEndConfirm(false);
      await loadExam();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("exams.errors.endEarly")));
    } finally {
      setIsEnding(false);
    }
  };

  const handleExport = async () => {
    if (!examId || isExporting || !exam) return;
    try {
      setIsExporting(true);
      const result = await exportAllExamPdfs(examId, i18n.language);
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = result.filename || `${exam.name}-exams.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("exams.actions.exportSuccess"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("exams.errors.export")));
    } finally {
      setIsExporting(false);
    }
  };

  const handleBack = () => {
    if (backTarget) {
      navigate(backTarget, { replace: true });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/exams", { replace: true });
  };

  return (
    <div className="space-y-0">
      <div className="mb-0 rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-raised)] dark:border-white/[0.06] dark:bg-[#1A1A1D]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="mt-0.5 h-8 w-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              {isLoading ? (
                <>
                  <Skeleton className="h-7 w-56 rounded" />
                  <Skeleton className="mt-1.5 h-5 w-40 rounded" />
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground dark:text-zinc-50">
                      {exam?.name ?? t("exams.defaultName")}
                    </h1>
                    {effectiveStatus && statusBadge(effectiveStatus, t)}
                    {exam && gradingTypeBadge(exam.grading_type, t)}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("exams.meta", {
                      subject: exam?.subject ?? "-",
                      totalQuestions: exam?.total_questions ?? 0,
                      duration: exam?.duration ?? 0,
                    })}
                  </p>
                  {exam?.grading_type === "STUDENT_SUBMISSION" && exam.start_time && exam.end_time && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateTime(exam.start_time, locale)}
                        {" "}
                        {t("exams.to")} {formatDateTime(exam.end_time, locale)}
                      </span>
                      {effectiveStatus === "active" && countdown && (
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-semibold ${
                            countdown === t("exams.timeExpired") ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {countdown}
                        </span>
                      )}
                      {effectiveStatus === "active" && (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                          <Users className="h-3.5 w-3.5" />
                          {t("exams.activeSessions", {
                            count: exam.active_session_count ?? 0,
                            defaultValue: `${exam.active_session_count ?? 0} học sinh đang làm bài`,
                          })}
                        </span>
                      )}
                      {(effectiveStatus === "end" || effectiveStatus === "closed") && (exam.overdue_session_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                          <Users className="h-3.5 w-3.5" />
                          {t("exams.overdueSessions", {
                            count: exam.overdue_session_count ?? 0,
                            defaultValue: `${exam.overdue_session_count ?? 0} phiên quá hạn chưa kết thúc`,
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {exam && (exam.status === "draft" || exam.status === "ready" || effectiveStatus === "scheduled") && (
              <Button
                size="sm"
                onClick={() => setShowPublishConfirm(true)}
                disabled={isPublishing}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                id="btn-publish"
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {t("exams.actions.publish")}
              </Button>
            )}
            {canEndExam && (
              <Button
                size="sm"
                onClick={() => setShowEndConfirm(true)}
                disabled={isEnding}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                id="btn-end"
              >
                {isEnding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StopCircle className="h-4 w-4" />
                )}
                {t("exams.actions.endEarly", { defaultValue: "Kết thúc" })}
              </Button>
            )}
            {canCloseExam && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCloseConfirm(true)}
                disabled={isClosing}
                className="gap-2"
                id="btn-close"
              >
                {isClosing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {t("exams.actions.close")}
              </Button>
            )}
            {!exam?.parent_exam_id ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleExport()}
                  disabled={isExporting}
                  className="gap-2"
                  id="btn-export"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t("exams.actions.exportPdf")}
                </Button>
                {canEditConfig && (
                  <Button size="sm" variant="outline" asChild className="gap-2">
                    <Link to={`/exams/${configExamId}/edit`}>
                      <Settings className="h-4 w-4" />
                      {t("exams.actions.settings")}
                    </Link>
                  </Button>
                )}
              </>
            ) : null}

          </div>
        </div>

        <div className="border-t border-border/50 px-3 dark:border-white/[0.06] sm:px-5">
          <nav className="-mb-px flex gap-0 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeSegment === tab.segment;
              const href = `/exams/${examId ?? ""}/${tab.segment}`;
              return (
                <button
                  key={tab.segment}
                  onClick={() =>
                    navigate(href, {
                      replace: true,
                      state: { from: backTarget || "/exams" },
                    })
                  }
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-primary text-primary dark:border-zinc-100 dark:text-zinc-50"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border dark:text-zinc-400 dark:hover:border-white/[0.12] dark:hover:text-zinc-100"
                  }`}
                  id={`tab-${tab.segment}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.publishConfirm.title", { defaultValue: "Mở kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("exams.publishConfirm.description", {
              defaultValue:
                "Sau khi mở kỳ thi, giáo viên không thể chỉnh sửa thông tin, template, câu hỏi hoặc mã đề. Kỳ thi phải được mở thì mới chấm và đồng bộ kết quả.",
            })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPublishConfirm(false)} disabled={isPublishing}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button type="button" variant="success" onClick={() => void handlePublish()} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("exams.actions.publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.closeConfirm.title", { defaultValue: "Đóng kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("exams.closeConfirm.description", {
              name: exam?.name ?? "",
              defaultValue:
                "Sau khi đóng kỳ thi, hệ thống sẽ không nhận khiếu nại mới, không xử lý khiếu nại đang chờ và không cho chấm lại.",
            })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCloseConfirm(false)} disabled={isClosing}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleClose()} disabled={isClosing}>
              {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("exams.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.endConfirm.title", { defaultValue: "Kết thúc kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("exams.endConfirm.description", {
              name: exam?.name ?? "",
              defaultValue:
                "Sau khi kết thúc kỳ thi, học sinh sẽ không thể làm bài hoặc nộp bài nữa. Kỳ thi sẽ được chuyển sang trạng thái Kết thúc.",
            })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEndConfirm(false)} disabled={isEnding}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleEnd()} disabled={isEnding}>
              {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("exams.actions.endEarly", { defaultValue: "Kết thúc" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-5">
        <Outlet context={{ exam, isLoading, onRefresh: loadExam }} />
      </div>
    </div>
  );
}
