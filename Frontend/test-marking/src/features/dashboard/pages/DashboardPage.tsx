import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { AlertTriangle, Archive, CalendarClock, Clock, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useCelebration } from "@/hooks/useCelebration";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardSummary } from "../dashboard.api";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { ExamStatus } from "@/types/academic.types";

type DashboardStats = {
  classCount: number;
  activeExamCount: number;
  pendingCloseExams: number;
  upcomingExamCount: number;
};

type DashboardExamRow = {
  id: string;
  name: string;
  classesLabel: string;
  status: ExamStatus;
  dueDate: string;
  submissionsLabel: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function statusBadge(status: ExamStatus, t: (key: string) => string) {
  const config = {
    draft: "bg-muted text-foreground/80 hover:bg-muted dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    ready: "bg-brand-soft text-brand-soft-foreground hover:bg-brand-soft/80",
    scheduled: "bg-info-soft text-info-foreground hover:bg-info-soft/80",
    active: "bg-success-soft text-success-foreground hover:bg-success-soft/80",
    end: "bg-warning-soft text-warning-foreground hover:bg-warning-soft/80",
    closed: "bg-muted text-foreground hover:bg-muted dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  } satisfies Record<ExamStatus, string>;
  return <Badge className={`rounded-full border-transparent px-2.5 py-1 font-medium ${config[status]}`}>{t(`examStatus.${status}`)}</Badge>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerConfetti } = useCelebration();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    classCount: 0,
    activeExamCount: 0,
    pendingCloseExams: 0,
    upcomingExamCount: 0,
  });
  const [recentExams, setRecentExams] = useState<DashboardExamRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);

  const statsItems = useMemo(
    () => [
      {
        label: t("dashboard.stats.classes"),
        value: isLoading ? "-" : stats.classCount.toLocaleString(),
        icon: Users,
        color: "bg-brand-soft text-brand-soft-foreground dark:bg-zinc-800 dark:text-zinc-300",
        href: "/classes",
      },
      {
        label: t("dashboard.stats.upcomingExams"),
        value: isLoading ? "-" : stats.upcomingExamCount.toLocaleString(),
        icon: CalendarClock,
        color: "bg-info-soft text-info-foreground dark:bg-[#172033] dark:text-blue-200",
        href: "/exams?status=scheduled",
      },
      {
        label: t("dashboard.stats.activeExams"),
        value: isLoading ? "-" : stats.activeExamCount.toLocaleString(),
        icon: Clock,
        color: "bg-warning-soft text-warning-foreground dark:bg-[#272114] dark:text-amber-200",
        href: "/exams?status=active",
      },
      {
        label: t("dashboard.stats.pendingCloseExams"),
        value: isLoading ? "-" : stats.pendingCloseExams.toLocaleString(),
        icon: Archive,
        color: "bg-danger-soft text-danger-foreground dark:bg-[#2A1718] dark:text-rose-200",
        href: "/exams?status=end",
      },
    ],
    [isLoading, stats, t],
  );

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);

        const summary = await getDashboardSummary();

        if (!isActive) return;
        setLoadError(null);
        setIsDegraded(Boolean(summary.degraded));
        setStats({
          classCount: summary.stats.class_count,
          activeExamCount: summary.stats.active_exam_count,
          pendingCloseExams: summary.stats.pending_close_exams,
          upcomingExamCount: summary.stats.upcoming_exam_count,
        });
        const state = location.state as { justLoggedIn?: boolean } | null;
        if (summary.stats.active_exam_count > 0 && state?.justLoggedIn) {
          triggerConfetti("schoolPride");
          // Clear history state to avoid refiring on manual navigations
          navigate(location.pathname, { replace: true, state: {} });
        }
        setRecentExams(summary.recent_exams.map((exam) => ({
          id: exam.id,
          name: exam.name,
          classesLabel: exam.classes_label,
          status: String(exam.status).toLowerCase() as ExamStatus,
          dueDate: formatDate(exam.due_date),
          submissionsLabel: exam.student_count > 0 ? `${exam.submission_count}/${exam.student_count}` : String(exam.submission_count || "-"),
        })));
      } catch (error) {
        if (!isActive) return;
        const message = getApiErrorMessage(error, t("dashboard.errors.load"));
        setLoadError(message);
        toast.error(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <div className="animate-in fade-in-0 space-y-7 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground dark:text-zinc-50">{t("dashboard.title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground dark:text-zinc-400">{t("dashboard.subtitle")}</p>
      </div>

      {(loadError || isDegraded) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {loadError ? t("dashboard.errors.load") : t("dashboard.partialDataTitle", { defaultValue: "Một phần dữ liệu tạm thời chưa sẵn sàng" })}
            </p>
            <p className="mt-0.5 text-amber-800/80 dark:text-amber-100/75">
              {loadError ?? t("dashboard.partialDataDescription", { defaultValue: "Trang vẫn hiển thị những dữ liệu đã tải được. Thử tải lại sau ít phút nếu số liệu chưa đầy đủ." })}
            </p>
          </div>
        </div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        {statsItems.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants} whileTap={{ scale: 0.95 }} className="h-full">
            <Link to={stat.href} className="group h-full block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-foreground/20 group-hover:shadow-md">
                <CardContent className="p-5 lg:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-muted-foreground dark:text-zinc-400">{stat.label}</p>
                      {isLoading ? (
                        <Skeleton className="mt-3 h-9 w-20" />
                      ) : (
                        <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-foreground dark:text-zinc-50">{stat.value}</p>
                      )}
                    </div>
                    <div className={`${stat.color} grid size-11 place-items-center rounded-2xl transition-transform duration-150 group-hover:-translate-y-0.5`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <Card>
        <CardHeader className="px-5 pt-5 lg:px-6 lg:pt-6">
          <CardTitle className="text-base font-semibold">{t("dashboard.recentActivityTitle")}</CardTitle>
          <CardDescription className="text-sm">{t("dashboard.recentActivityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 lg:px-6 lg:pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dashboard.table.examName")}</TableHead>
                <TableHead>{t("dashboard.table.class")}</TableHead>
                <TableHead>{t("dashboard.table.status")}</TableHead>
                <TableHead>{t("dashboard.table.dueDate")}</TableHead>
                <TableHead>{t("dashboard.table.submissions")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && recentExams.length === 0 && (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={`recent-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              )}
              {recentExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">
                    <Link to={`/exams/${exam.id}/results`} className="text-primary hover:text-primary/80 transition-colors">
                      {exam.name}
                    </Link>
                  </TableCell>
                  <TableCell>{exam.classesLabel}</TableCell>
                  <TableCell>{statusBadge(exam.status, t)}</TableCell>
                  <TableCell>{exam.dueDate}</TableCell>
                  <TableCell>{exam.submissionsLabel}</TableCell>
                  <TableCell>
                    <Link to={`/exams/${exam.id}/results`} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
                      {t("dashboard.viewDetail")}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && recentExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-2xl bg-muted dark:bg-white/[0.05]">
                        <Archive className="h-5 w-5 text-muted-foreground dark:text-zinc-400" />
                      </div>
                      <span className="font-medium text-foreground dark:text-zinc-100">{t("dashboard.noRecentExams")}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
