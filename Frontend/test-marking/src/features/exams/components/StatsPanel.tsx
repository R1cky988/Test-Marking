import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/components/ui/utils";
import { scoreText, type ExamFormat, type ExamStats } from "../examsSpring.api";

function Stat({ label, value, hint, onClick, tone }: { label: string; value: string; hint?: string; onClick?: () => void; tone?: string }) {
  const body = (
    <>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</span>
      {hint && <span className="mt-0.5 text-xs text-muted-foreground">{hint}</span>}
    </>
  );
  const cls = "flex flex-col items-start rounded-2xl border bg-card p-4 text-left";
  return onClick
    ? <button type="button" onClick={onClick} className={cn(cls, "transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary")}>{body}</button>
    : <div className={cls}>{body}</div>;
}

/** Score spread 0-2 … 8-10 as bars. Pure CSS so it also prints and works without a chart library. */
export function ScoreSpread({ stats }: { stats: ExamStats }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...stats.distribution.map((b) => b.count));
  return (
    <figure aria-label={t("exam.stats.spread", "Phổ điểm")} className="rounded-2xl border bg-card p-5">
      <figcaption className="mb-4 text-sm font-semibold">{t("exam.stats.spread", "Phổ điểm")} <span className="font-normal text-muted-foreground">({t("exam.stats.scale", "thang 10")})</span></figcaption>
      <div className="flex h-44 items-end gap-3" role="list">
        {stats.distribution.map((b) => (
          <div key={b.label} role="listitem" className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" aria-label={`${b.label}: ${b.count}`}>
            <span className="text-sm font-semibold tabular-nums">{b.count}</span>
            <div className="w-full rounded-t-lg bg-primary/80" style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count > 0 ? 6 : 2, opacity: b.count > 0 ? 1 : 0.25 }} />
            <span className="text-xs text-muted-foreground tabular-nums">{b.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** Totals + highest / lowest / average + spread. For ONLINE and SUBMIT exams the handed-in count opens the list of who handed in. */
export function StatsPanel({ stats, format, onShowSubmitted, teacher }: { stats: ExamStats; format: ExamFormat; onShowSubmitted?: () => void; teacher: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label={t("exam.stats.papers", "Tổng số bài")} value={String(stats.total_papers)} hint={t("exam.stats.ofStudents", "trên {{n}} học sinh", { n: stats.total_students })} />
        {stats.submitted_count != null && (
          <Stat label={t("exam.stats.submitted", "Đã nộp")} value={String(stats.submitted_count)} hint={onShowSubmitted ? t("exam.stats.seeList", "Xem danh sách") : undefined} onClick={onShowSubmitted} tone="text-primary" />
        )}
        <Stat label={t("exam.stats.highest", "Cao nhất")} value={scoreText(stats.highest)} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat label={t("exam.stats.lowest", "Thấp nhất")} value={scoreText(stats.lowest)} tone="text-rose-600 dark:text-rose-400" />
        <Stat label={t("exam.stats.average", "Trung bình")} value={scoreText(stats.average)} />
        {teacher && stats.violation_count != null && <Stat label={t("exam.stats.violations", "Vi phạm")} value={String(stats.violation_count)} tone={stats.violation_count > 0 ? "text-rose-600 dark:text-rose-400" : undefined} />}
      </div>
      <ScoreSpread stats={stats} />
      {format !== "OFFLINE" && stats.submitted_count == null && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{t("exam.stats.noSubmit", "Chưa có bài nộp")}</p>}
    </div>
  );
}
