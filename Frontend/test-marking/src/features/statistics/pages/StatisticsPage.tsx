import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  RefreshCw,
  FileSpreadsheet,
  BarChart3,
  Users,
  CheckCircle2,
  TrendingDown,
  AlertTriangle,
  Eye,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTechnicalValue, formatUserFacingMessage, getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getExamStatistics, recalculateStatistics } from "../statistics.api";
import { exportScoreboard } from "@/features/exports/exports.api";
import type { ExamStatistics } from "../statistics.types";

// ─── BAR CHART COLORS ───────────────────────────────────────────

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981"];

// ─── STAT CARD ──────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  valueColor,
  loading,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-24 rounded" />
            ) : (
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${valueColor ?? "text-foreground"}`}
              >
                {value}
              </p>
            )}
            {subtitle && !loading && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-xl p-2.5 ${iconBg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SCORE CHART TOOLTIP ────────────────────────────────────────

function ScoreTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey?: string; payload: { range: string } }>;
}) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  const isPercent = payload[0].dataKey === "percent";
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold text-foreground">{t("statistics.tooltip.range", { range: payload[0].payload.range })}</p>
      <p className="text-muted-foreground">
        {isPercent
          ? t("statistics.tooltip.percent", { value: payload[0].value })
          : t("statistics.tooltip.count", { count: payload[0].value })}
      </p>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────

export function StatisticsPage() {
  const { id: examId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [stats, setStats] = useState<ExamStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [chartMetric, setChartMetric] = useState<"count" | "percent">("count");

  const loadStats = useCallback(async () => {
    if (!examId) return;
    try {
      setIsLoading(true);
      const data = await getExamStatistics(examId);
      setStats(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("statistics.errors.load")));
    } finally {
      setIsLoading(false);
    }
  }, [examId, t]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleRecalculate = async () => {
    if (!examId || isRecalculating) return;
    try {
      setIsRecalculating(true);
      const result = await recalculateStatistics(examId);
      toast.success(formatUserFacingMessage(result.message ?? t("statistics.recalculateSuccess")));
      await loadStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("statistics.errors.recalculate")));
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportScoreboard = async () => {
    if (!examId || isExporting) return;
    try {
      setIsExporting(true);
      toast.info(t("statistics.export.loading"));
      const result = await exportScoreboard(examId);
      // Trigger download
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = t("statistics.export.fileName", { id: examId });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("statistics.export.success"));
    } catch (err) {
      const msg = getApiErrorMessage(err, "");
      if (msg.includes("timeout") || msg.includes("ECONNABORTED")) {
        toast.error(
          t("statistics.export.timeout"),
        );
      } else {
        toast.error(getApiErrorMessage(err, t("statistics.export.failed")));
      }
    } finally {
      setIsExporting(false);
    }
  };

  const overview = stats?.overview;
  const distributionTotal = useMemo(
    () => stats?.score_distribution?.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [stats?.score_distribution],
  );
  const chartData = useMemo(
    () =>
      stats?.score_distribution?.map((item) => ({
        ...item,
        percent: distributionTotal > 0 ? Number(((item.count / distributionTotal) * 100).toFixed(1)) : 0,
      })) ?? [],
    [distributionTotal, stats?.score_distribution],
  );
  const versionAnalyses = useMemo(() => {
    if (stats?.version_analyses?.length) return stats.version_analyses;
    if (stats?.item_analysis?.length) {
      return [{
        exam_version_id: null,
        version_code: t("statistics.itemAnalysis.allVersions"),
        total_sheets: stats.overview.graded_count,
        item_analysis: stats.item_analysis,
      }];
    }
    return [];
  }, [stats, t]);
  const lowCorrectQuestions = useMemo(
    () => versionAnalyses.flatMap((version) => version.item_analysis.filter((item) => item.total_answers > 0 && item.correct_rate < 50)),
    [versionAnalyses],
  );
  const gradingProgress = overview && overview.assigned_count > 0
    ? (overview.graded_count / overview.assigned_count) * 100
    : 0;

  // Compute below-average display value
  const belowAvgDisplay = useMemo(() => {
    if (!overview) return t('common.dash');
    return `${overview.below_average_rate.toFixed(1)}%`;
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-64 rounded" />
              <Skeleton className="mt-1 h-5 w-48 rounded" />
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                {stats?.exam_name ?? t("statistics.title")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("statistics.subtitle", { subject: stats?.subject ?? t("statistics.subjectFallback") })}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRecalculate()}
            disabled={isRecalculating || isLoading}
            className="gap-2"
            id="btn-recalculate"
          >
            {isRecalculating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRecalculating ? t("statistics.recalculating") : t("statistics.recalculate")}
          </Button>

          <Button
            size="sm"
            onClick={() => void handleExportScoreboard()}
            disabled={isExporting || isLoading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            id="btn-export-excel"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {isExporting ? t("statistics.export.exporting") : t("statistics.export.button")}
          </Button>
        </div>
      </div>

      {!isLoading && stats && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{t("statistics.insights.title")}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {distributionTotal > 0
                    ? t("statistics.insights.graded", { count: distributionTotal })
                    : t("statistics.insights.noGraded")}
                </p>
              </div>
              <div className="flex rounded-xl border bg-muted/40 p-1 dark:border-white/[0.06] dark:bg-white/[0.04]">
                {(["count", "percent"] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      chartMetric === metric
                        ? "bg-card text-foreground shadow-sm dark:bg-white/[0.08]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setChartMetric(metric)}
                  >
                    {t(`statistics.chartMetric.${metric}`)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground">{t("statistics.insights.lowCorrect")}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{lowCorrectQuestions.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("statistics.insights.lowCorrectHint")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 4 Summary Cards ────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("statistics.cards.assignedStudents")}
          value={overview?.assigned_count ?? 0}
          subtitle={stats?.grading_type === "TEACHER_GRADING"
            ? t("statistics.cards.teacherProgress", {
                graded: overview?.graded_count ?? 0,
                ungraded: overview?.ungraded_count ?? 0,
              })
            : t("statistics.cards.studentSubmissionProgress", {
                submitted: overview?.total_submissions ?? 0,
              })}
          icon={<Users className="h-5 w-5 text-primary" />}
          iconBg="bg-brand-soft"
          loading={isLoading}
        />
        <StatCard
          title={t("statistics.cards.gradingProgress")}
          value={overview ? `${gradingProgress.toFixed(1)}%` : t("common.dash")}
          subtitle={t("statistics.cards.gradingProgressCount", {
            graded: overview?.graded_count ?? 0,
            assigned: overview?.assigned_count ?? 0,
          })}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={isLoading}
        />
        <StatCard
          title={t("statistics.cards.averageScore")}
          value={overview ? overview.average_score.toFixed(2) : t("common.dash")}
          subtitle={t("statistics.cards.averageOutOf", { scale: stats?.score_scale ?? 10 })}
          icon={<BarChart3 className="h-5 w-5 text-sky-600" />}
          iconBg="bg-sky-50"
          loading={isLoading}
        />
        <StatCard
          title={t("statistics.cards.belowAverage")}
          value={belowAvgDisplay}
          subtitle={t("statistics.cards.belowAverageCount", {
            count: overview?.below_average_count ?? 0,
            threshold: (stats?.score_scale ?? 10) / 2,
          })}
          icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
          iconBg="bg-danger-soft"
          valueColor="text-rose-600"
          loading={isLoading}
        />
      </div>

      {/* ── Phổ điểm ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            {t("statistics.scoreDistribution.title")}
          </CardTitle>
          <CardDescription>{t("statistics.scoreDistribution.subtitle", { scale: stats?.score_scale ?? 10 })}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-52 w-full rounded-lg" />
          ) : !chartData.length || distributionTotal === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {t("statistics.scoreDistribution.empty")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 16, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  allowDecimals={chartMetric === "percent"}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  label={{
                    value: t(`statistics.scoreDistribution.${chartMetric === "count" ? "yLabel" : "percentYLabel"}`),
                    angle: -90,
                    position: "insideLeft",
                    offset: 16,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<ScoreTooltip />} />
                <Bar dataKey={chartMetric} radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Item Analysis ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            {t("statistics.itemAnalysis.title")}
          </CardTitle>
          <CardDescription>
            {t("statistics.itemAnalysis.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : !versionAnalyses.length ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {t("statistics.itemAnalysis.empty")}
            </div>
          ) : (
            <Tabs defaultValue={versionAnalyses[0]?.version_code} className="space-y-0">
              <div className="border-b px-6 py-4">
                <div className="overflow-x-auto">
                  <TabsList className="inline-flex h-10 min-w-max">
                    {versionAnalyses.map((version) => {
                      const versionLabel = version.exam_version_id
                        ? t("statistics.itemAnalysis.versionBadge", { code: version.version_code })
                        : version.version_code;
                      return (
                      <TabsTrigger
                        key={version.exam_version_id ?? version.version_code}
                        value={version.version_code}
                        className="gap-2 whitespace-nowrap font-mono"
                      >
                        {versionLabel}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {version.total_sheets}
                        </span>
                      </TabsTrigger>
                    );
                    })}
                  </TabsList>
                </div>
              </div>
              {versionAnalyses.map((version) => (
                <TabsContent
                  key={version.exam_version_id ?? version.version_code}
                  value={version.version_code}
                  className="m-0"
                >
                  {(() => {
                    const versionLabel = version.exam_version_id
                      ? t("statistics.itemAnalysis.versionBadge", { code: version.version_code })
                      : version.version_code;
                    return (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {versionLabel}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t("statistics.itemAnalysis.versionSheets", { count: version.total_sheets })}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t("statistics.itemAnalysis.versionQuestionCount", { count: version.item_analysis.length })}
                    </span>
                  </div>
                    );
                  })()}
                  {version.total_sheets === 0 || !version.item_analysis.length ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      {t("statistics.itemAnalysis.versionEmpty")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-14 text-center">{t("statistics.itemAnalysis.table.question")}</TableHead>
                            <TableHead>{t("statistics.itemAnalysis.table.correctAnswer")}</TableHead>
                            <TableHead>{t("statistics.itemAnalysis.table.correctRate")}</TableHead>
                            <TableHead>{t("statistics.itemAnalysis.table.answers")}</TableHead>
                            <TableHead>{t("statistics.itemAnalysis.table.distribution")}</TableHead>
                            <TableHead className="w-28">{t("statistics.itemAnalysis.table.warning")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {version.item_analysis.map((item) => {
                            const isLowCorrect = item.total_answers > 0 && item.correct_rate < 50;
                            return (
                              <TableRow
                                key={`${version.version_code}-${item.question_number}`}
                                className={
                                  isLowCorrect
                                    ? "bg-danger-soft hover:bg-danger-soft/80 dark:bg-rose-950/20"
                                    : undefined
                                }
                              >
                                <TableCell className="text-center font-medium">
                                  {item.question_number}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono font-bold">
                                    {item.correct_answer || t('common.dash')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-20 rounded-full bg-muted">
                                      <div
                                        className="h-1.5 rounded-full transition-all"
                                        style={{
                                          width: `${item.correct_rate}%`,
                                          backgroundColor: isLowCorrect ? "#f43f5e" : "#10b981",
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`text-sm font-semibold ${isLowCorrect ? "text-rose-600" : "text-emerald-600"}`}
                                    >
                                      {item.correct_rate.toFixed(1)}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {item.correct_count}/{item.total_answers}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(item.answer_distribution)
                                      .sort(([a], [b]) => a.localeCompare(b))
                                      .map(([ans, count]) => (
                                        <span
                                          key={ans}
                                          className={`inline-flex h-6 items-center rounded px-1.5 text-xs font-medium ${
                                            ans === item.correct_answer
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-muted text-muted-foreground"
                                          }`}
                                        >
                                          {ans}:{count}
                                        </span>
                                      ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isLowCorrect && (
                                    <Badge
                                      variant="destructive"
                                      className="gap-1 text-xs"
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      {t("statistics.itemAnalysis.warning")}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* ── Danh sách lỗi ──────────────────────────────────── */}
      {(isLoading || (stats?.submission_errors?.length ?? 0) > 0) && (
        <Card className="border-danger-soft/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-danger-foreground">
              <AlertTriangle className="h-4 w-4" />
              {t("statistics.errorsSection.title", {
                count: stats?.submission_errors.length ?? 0,
              })}
            </CardTitle>
            <CardDescription>
              {t("statistics.errorsSection.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-danger-soft/50">
                      <TableHead>{t("common.fullName")}</TableHead>
                      <TableHead>{t("common.studentCode")}</TableHead>
                      <TableHead>{t("statistics.errorsSection.table.errorType")}</TableHead>
                      <TableHead>{t("statistics.errorsSection.table.detail")}</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats!.submission_errors.map((err) => (
                      <TableRow key={err.sheet_id} className="hover:bg-danger-soft/50">
                        <TableCell className="font-medium">{err.student_name}</TableCell>
                        <TableCell className="font-mono text-sm">{err.student_code}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-danger-soft bg-danger-soft text-danger-foreground"
                          >
                            {formatTechnicalValue(err.error_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatUserFacingMessage(err.error_detail)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="gap-1 text-xs"
                          >
                            <Link
                              to={`/exams/${examId ?? ""}/results/${err.sheet_id}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("statistics.errorsSection.viewSheet")}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
