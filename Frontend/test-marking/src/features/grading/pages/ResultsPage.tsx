import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import axios from "axios";
import {
  AlertTriangle,
  Eye,
  RefreshCw,
  Search,
  FileText,
  FileSpreadsheet,
  Images,
  Download,
  Loader2,
  X,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListPagination } from "@/components/ListPagination";
import { getExam } from "@/features/exams/exams.api";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { Exam } from "@/types/academic.types";
import type { AnswerSheetListItem } from "../grading.api";
import { getExamAnswerSheets } from "../grading.api";
import {
  exportScoreboard,
  exportSheetPdf,
  createProcessedImagesPdfExport,
  getProcessedImagesExportJob,
  retryProcessedImagesExportJob,
} from "@/features/exports/exports.api";
import type { ProcessedImagesExportJob } from "@/features/exports/exports.types";

// ─── HELPERS ────────────────────────────────────────────────────

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(2);
}

function getStudentDisplayCode(sheet: AnswerSheetListItem) {
  return sheet.identification_mode === "EXTERNAL"
    ? sheet.student.student_code || "—"
    : sheet.student.internal_id || "—";
}

type SheetStatus = "graded" | "error" | "pending";

function getSheetStatus(sheet: AnswerSheetListItem): SheetStatus {
  if (sheet.sync_status === "ERROR") return "error";
  if (sheet.graded_at === null) return "pending";
  return "graded";
}

function StatusBadge({ sheet }: { sheet: AnswerSheetListItem }) {
  const { t } = useTranslation();
  const status = getSheetStatus(sheet);
  if (status === "graded") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
        {t("grading.results.status.graded")}
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300">
        {t("grading.results.status.error")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
      {t("grading.results.status.pending")}
    </Badge>
  );
}

// ─── LIMIT OPTIONS ───────────────────────────────────────────────

// ─── MAIN PAGE ──────────────────────────────────────────────────

export function ResultsPage() {
  const { id: examId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  // Data state
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<AnswerSheetListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & filter state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "error">(
    "all",
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Export state per-sheet
  const [exportingSheetId, setExportingSheetId] = useState<string | null>(null);
  const [isExportingScoreboard, setIsExportingScoreboard] = useState(false);
  const [processedImagesExportJob, setProcessedImagesExportJob] =
    useState<ProcessedImagesExportJob | null>(null);
  const [isCreatingProcessedImagesExport, setIsCreatingProcessedImagesExport] =
    useState(false);
  const [missingImageSheetId, setMissingImageSheetId] = useState<string | null>(
    null,
  );

  // Debounce search
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!examId) return;
    try {
      setIsLoading(true);
      const [loadedExam, sheets] = await Promise.all([
        exam ? Promise.resolve(exam) : getExam(examId),
        getExamAnswerSheets(examId, {
          page,
          limit,
          search: debouncedSearch || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
      ]);
      setExam(loadedExam);
      setResults(sheets.data);
      setTotal(sheets.meta.total);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("grading.results.errors.load")));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, page, limit, debouncedSearch, statusFilter, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!examId) return;
    const savedJobId = localStorage.getItem(
      `processed-images-export-job:${examId}`,
    );
    if (!savedJobId) return;
    void getProcessedImagesExportJob(savedJobId)
      .then(setProcessedImagesExportJob)
      .catch(() =>
        localStorage.removeItem(`processed-images-export-job:${examId}`),
      );
  }, [examId]);

  useEffect(() => {
    const job = processedImagesExportJob;
    if (!job || !["PENDING", "PROCESSING"].includes(job.status)) return;
    const timer = window.setInterval(() => {
      void getProcessedImagesExportJob(job.id)
        .then(setProcessedImagesExportJob)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [processedImagesExportJob]);

  // Export scoreboard
  const handleExportScoreboard = async () => {
    if (!examId || isExportingScoreboard) return;
    try {
      setIsExportingScoreboard(true);
      toast.info(t("grading.results.export.scoreboardLoading"));
      const result = await exportScoreboard(examId);
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = `bang-diem-${examId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("grading.results.export.scoreboardSuccess"));
    } catch (err) {
      const msg = getApiErrorMessage(err, "");
      if (msg.includes("timeout") || msg.includes("ECONNABORTED")) {
        toast.error(t("grading.results.export.timeout"));
      } else {
        toast.error(
          getApiErrorMessage(err, t("grading.results.export.scoreboardFailed")),
        );
      }
    } finally {
      setIsExportingScoreboard(false);
    }
  };

  const rememberProcessedImagesExportJob = (job: ProcessedImagesExportJob) => {
    setProcessedImagesExportJob(job);
    if (examId) {
      localStorage.setItem(`processed-images-export-job:${examId}`, job.id);
    }
  };

  const handleCreateProcessedImagesExport = async () => {
    if (!examId || isCreatingProcessedImagesExport) return;
    try {
      setIsCreatingProcessedImagesExport(true);
      const job = await createProcessedImagesPdfExport(examId);
      rememberProcessedImagesExportJob(job);
      toast.success(t("grading.results.export.allQueued"));
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("grading.results.export.allFailed")),
      );
    } finally {
      setIsCreatingProcessedImagesExport(false);
    }
  };

  const handleRetryProcessedImagesExport = async () => {
    if (!processedImagesExportJob) return;
    try {
      const job = await retryProcessedImagesExportJob(
        processedImagesExportJob.id,
      );
      rememberProcessedImagesExportJob(job);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("grading.results.export.allFailed")),
      );
    }
  };

  // Export single sheet PDF
  const handleExportPdf = async (sheetId: string) => {
    if (exportingSheetId) return;
    try {
      setExportingSheetId(sheetId);
      setMissingImageSheetId(null);
      const result = await exportSheetPdf(sheetId);
      window.open(result.download_url, "_blank", "noopener,noreferrer");
      toast.success(t("grading.results.export.sheetOpened"));
    } catch (err) {
      const errorCode = axios.isAxiosError(err)
        ? (err.response?.data as any)?.error?.code
        : undefined;
      const msg = getApiErrorMessage(err, "");
      if (errorCode === "IMAGE_NOT_FOUND" || msg.includes("IMAGE_NOT_FOUND")) {
        setMissingImageSheetId(sheetId);
      } else if (msg.includes("timeout")) {
        toast.error(t("grading.results.export.timeout"));
      } else {
        toast.error(
          getApiErrorMessage(err, t("grading.results.export.sheetFailed")),
        );
      }
    } finally {
      setExportingSheetId(null);
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {exam ? exam.name : t("grading.results.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("grading.results.subtitle", {
              subject: exam?.subject ?? t("grading.results.subjectFallback"),
              count: total,
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Làm mới */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="gap-2"
            id="btn-refresh"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </Button>

          {/* Xuất bảng điểm */}
          <Button
            size="sm"
            onClick={() => void handleExportScoreboard()}
            disabled={isExportingScoreboard || isLoading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            id="btn-export-excel"
          >
            {isExportingScoreboard ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {isExportingScoreboard
              ? t("grading.results.export.exporting")
              : t("grading.results.export.exportScoreboard")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCreateProcessedImagesExport()}
            disabled={
              isCreatingProcessedImagesExport ||
              processedImagesExportJob?.status === "PENDING" ||
              processedImagesExportJob?.status === "PROCESSING"
            }
            className="gap-2"
            id="btn-export-processed-images"
          >
            {isCreatingProcessedImagesExport ||
            processedImagesExportJob?.status === "PENDING" ||
            processedImagesExportJob?.status === "PROCESSING" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Images className="h-4 w-4" />
            )}
            {t("grading.results.export.exportAllProcessed")}
          </Button>
        </div>
      </div>

      {processedImagesExportJob ? (
        <Alert
          className={
            processedImagesExportJob.status === "FAILED"
              ? "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30"
              : "border-border bg-muted/30"
          }
        >
          <Images className="h-4 w-4" />
          <AlertTitle>
            {t(
              `grading.results.export.jobStatus.${processedImagesExportJob.status}`,
            )}
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-3">
              {["PENDING", "PROCESSING"].includes(
                processedImagesExportJob.status,
              ) ? (
                <>
                  <Progress value={processedImagesExportJob.progress} />
                  <p className="text-xs text-muted-foreground">
                    {t("grading.results.export.jobProgress", {
                      processed: processedImagesExportJob.processed_items,
                      total: processedImagesExportJob.total_items,
                      progress: processedImagesExportJob.progress,
                    })}
                  </p>
                </>
              ) : null}
              {processedImagesExportJob.failed_items > 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t("grading.results.export.jobPartialFailure", {
                    count: processedImagesExportJob.failed_items,
                  })}
                </p>
              ) : null}
              {processedImagesExportJob.error_message ? (
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  {processedImagesExportJob.error_message}
                </p>
              ) : null}
              <div className="flex gap-2">
                {processedImagesExportJob.status === "COMPLETED" &&
                processedImagesExportJob.download_url ? (
                  <Button size="sm" asChild className="gap-2">
                    <a
                      href={processedImagesExportJob.download_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      {t("grading.results.export.downloadAll")}
                    </a>
                  </Button>
                ) : null}
                {processedImagesExportJob.status === "FAILED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRetryProcessedImagesExport()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("grading.results.export.retry")}
                  </Button>
                ) : null}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {missingImageSheetId ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("grading.results.export.missingImageTitle")}
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{t("grading.results.export.missingImageDescription")}</p>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMissingImageSheetId(null)}
                >
                  {t("grading.results.export.dismissMissingImage")}
                </Button>
                <Button size="sm" asChild>
                  <Link
                    to={`/exams/${examId ?? ""}/results/${missingImageSheetId}?attach=processed&retryExport=1`}
                  >
                    {t("grading.results.export.attachAndRetry")}
                  </Link>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="input-search"
            type="search"
            placeholder={t("grading.results.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t("grading.results.clearSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as "all" | "graded" | "error");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" id="select-status">
            <SelectValue placeholder={t("grading.results.filters.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("grading.results.filters.allStatus")}
            </SelectItem>
            <SelectItem value="graded">
              {t("grading.results.status.graded")}
            </SelectItem>
            <SelectItem value="error">
              {t("grading.results.status.error")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm ring-1 ring-border/40">
        <CardHeader className="border-b border-border/40 pb-3 pt-4">
          <CardTitle className="text-base">
            {t("grading.results.tableTitle")}
          </CardTitle>
          <CardDescription>
            {isLoading
              ? t("common.loading")
              : t("grading.results.tableSummary", { total, page, totalPages })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center">
                    {t("common.index")}
                  </TableHead>
                  <TableHead className="min-w-[160px]">
                    {t("common.fullName")}
                  </TableHead>
                  <TableHead className="min-w-[100px]">
                    {t("common.studentCode")}
                  </TableHead>
                  <TableHead className="min-w-[80px]">
                    {t("grading.results.examCode")}
                  </TableHead>
                  <TableHead className="min-w-[90px]">
                    {t("grading.results.score")}
                  </TableHead>
                  <TableHead className="min-w-[130px]">
                    {t("common.status")}
                  </TableHead>
                  <TableHead className="min-w-[180px]">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Loading skeletons */}
                {isLoading &&
                  [...Array(limit > 20 ? 10 : limit)].map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      {[...Array(7)].map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {/* Empty state */}
                {!isLoading && results.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-muted-foreground"
                    >
                      {debouncedSearch || statusFilter !== "all"
                        ? t("grading.results.emptyFiltered")
                        : t("grading.results.empty")}
                    </TableCell>
                  </TableRow>
                )}

                {/* Data rows */}
                {!isLoading &&
                  results.map((result, index) => {
                    const rowIndex = (page - 1) * limit + index + 1;
                    const scoreVal = result.total_score;
                    const isGraded = result.graded_at !== null;
                    const isExportingThis = exportingSheetId === result.id;

                    return (
                      <TableRow key={result.id} className="group">
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {rowIndex}
                        </TableCell>
                        <TableCell className="font-medium">
                          {result.student.full_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {getStudentDisplayCode(result)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {result.exam_code ??
                              result.exam_version?.version_code ??
                              "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isGraded ? (
                            <span
                              className={`text-sm font-bold ${
                                scoreVal >= 8
                                  ? "text-emerald-600"
                                  : scoreVal >= 5
                                    ? "text-primary"
                                    : "text-rose-600"
                              }`}
                            >
                              {formatScore(scoreVal)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              {t("grading.results.notGraded")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge sheet={result} />
                            {result.submission_mode === "offline_sync" && (
                              <Badge
                                variant={
                                  result.offline_verified
                                    ? "outline"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {t(
                                  result.offline_verified
                                    ? "submissionMetadata.offlineBadge"
                                    : "submissionMetadata.notVerified",
                                )}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {/* Xem chi tiết */}
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 gap-1 px-2 text-xs"
                            >
                              <Link
                                to={`/exams/${examId ?? ""}/results/${result.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {t("common.view")}
                              </Link>
                            </Button>

                            {/* Xuất PDF */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleExportPdf(result.id)}
                              disabled={
                                isExportingThis || exportingSheetId !== null
                              }
                              className="h-7 gap-1 px-2 text-xs"
                              id={`btn-pdf-${result.id}`}
                            >
                              {isExportingThis ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                              {isExportingThis
                                ? t("grading.results.export.exporting")
                                : t("grading.results.export.exportPdf")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ─────────────────────────────────────── */}
      <ListPagination
        page={page}
        limit={limit}
        total={total}
        isLoading={isLoading}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />
    </div>
  );
}
