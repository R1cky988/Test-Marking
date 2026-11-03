import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, PlayCircle, School } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EmptyState } from "@/components/detail/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { FormatBadge } from "@/features/exams/components/examMeta";
import { getExamOverview, type OverviewExam } from "@/features/exams/examsSpring.api";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";

function Tile({ icon, label, value, tone, to }: { icon: ReactNode; label: string; value: number; tone: string; to: string }) {
  return (
    <Link to={to} className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary">
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5", tone)}>{icon}</span>
      <span><span className="block text-2xl font-semibold tabular-nums">{value}</span><span className="text-sm text-muted-foreground">{label}</span></span>
    </Link>
  );
}

function ExamList({ title, icon, exams, total, empty, locale, showEnd }: { title: string; icon: ReactNode; exams: OverviewExam[]; total: number; empty: string; locale: string; showEnd?: boolean }) {
  const { t } = useTranslation();
  const fmt = (v: string | null) => (v ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "—");
  return (
    <section className="rounded-2xl border bg-card p-5" aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground">{icon}{title}<span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{total}</span></h2>
      {exams.length === 0 ? <p className="py-4 text-sm text-muted-foreground">{empty}</p> : (
        <ul className="divide-y">
          {exams.map((e) => (
            <li key={e.id}>
              <Link to={`/exams/${e.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:text-primary">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[e.class_name, showEnd ? `${t("exam.field.to", "Kết thúc")} ${fmt(e.to_time)}` : fmt(e.from_time)].filter(Boolean).join(" · ")}</span>
                </span>
                <FormatBadge format={e.format} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Exams that are coming, running and over (by the clock of the server), and the classes involved. */
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const data = useQuery({ queryKey: ["exams", "overview"], queryFn: getExamOverview, refetchInterval: 60_000 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("dashboard.title", "Tổng quan")}</h1>
        <p className="mt-1 text-muted-foreground">{t("dashboard.subtitle", "Kỳ thi sắp tới, đang diễn ra và đã xong, cùng các lớp liên quan.")}</p>
      </div>

      {data.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : data.isError || !data.data ? (
        <div role="alert" className="rounded-2xl border border-destructive/30 p-6 text-center text-sm text-destructive">{getApiErrorMessage(data.error, t("dashboard.failed", "Không tải được tổng quan"))}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile to="/exams" icon={<CalendarClock />} label={t("dashboard.upcoming", "Sắp diễn ra")} value={data.data.upcoming_count} tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" />
            <Tile to="/exams" icon={<PlayCircle />} label={t("dashboard.ongoing", "Đang diễn ra")} value={data.data.ongoing_count} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
            <Tile to="/exams" icon={<CheckCircle2 />} label={t("dashboard.completed", "Đã kết thúc")} value={data.data.completed_count} tone="bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300" />
            <Tile to="/classes" icon={<School />} label={t("dashboard.classes", "Lớp học")} value={data.data.class_count} tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ExamList title={t("dashboard.ongoing", "Đang diễn ra")} icon={<PlayCircle />} exams={data.data.ongoing} total={data.data.ongoing_count} empty={t("dashboard.noOngoing", "Không có kỳ thi nào đang diễn ra")} locale={locale} showEnd />
            <ExamList title={t("dashboard.upcoming", "Sắp diễn ra")} icon={<CalendarClock />} exams={data.data.upcoming} total={data.data.upcoming_count} empty={t("dashboard.noUpcoming", "Chưa có kỳ thi sắp tới")} locale={locale} />
            <ExamList title={t("dashboard.completed", "Đã kết thúc")} icon={<CheckCircle2 />} exams={data.data.completed} total={data.data.completed_count} empty={t("dashboard.noCompleted", "Chưa có kỳ thi nào kết thúc")} locale={locale} showEnd />
            <section className="rounded-2xl border bg-card p-5" aria-label={t("dashboard.relatedClasses", "Lớp liên quan")}>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground"><School />{t("dashboard.relatedClasses", "Lớp liên quan")}<span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{data.data.class_count}</span></h2>
              {data.data.classes.length === 0 ? <EmptyState icon={<School />} title={t("dashboard.noClasses", "Bạn chưa tham gia lớp nào")} /> : (
                <ul className="flex flex-wrap gap-2">
                  {data.data.classes.map((c) => (
                    <li key={c.id}>
                      <Link to={`/classes/${c.id}`} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                        {c.name}<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{c.role === "TEACHER" ? t("dashboard.roleTeacher", "Giáo viên") : t("dashboard.roleStudent", "Học sinh")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {data.data.draft_count > 0 && <p className="mt-4 text-sm text-muted-foreground">{t("dashboard.drafts", "{{n}} kỳ thi nháp chưa công bố.", { n: data.data.draft_count })} <Link to="/exams" className="text-primary underline">{t("dashboard.openExams", "Mở danh sách")}</Link></p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
