import { useQuery } from "@tanstack/react-query";
import { BarChart3, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/detail/shared";
import { LatexContent } from "@/components/latex/LatexContent";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { DifficultyBadge } from "@/features/questions/components/questionMeta";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getAnalysis, type QuestionStat } from "../examsSpring.api";

function Bar({ percent, tone }: { percent: number; tone: string }) {
  return <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, percent)}%` }} /></div>;
}

function Card({ q, index }: { q: QuestionStat; index: number }) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border bg-card p-4">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">{index}</span>
        {q.difficulty && <DifficultyBadge difficulty={q.difficulty as "EASY" | "MEDIUM" | "HARD"} />}
        <span className="text-xs text-muted-foreground">{t("exam.analysis.inCodes", "Có trong mã đề {{codes}}", { codes: q.test_codes.join(", ") })} · {t("exam.analysis.appeared", "{{n}} bài", { n: q.appeared })}</span>
        <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", q.correct_percent >= 60 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200" : q.correct_percent >= 30 ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200" : "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200")}>{t("exam.analysis.correct", "Đúng {{p}}%", { p: q.correct_percent })}</span>
      </header>
      <LatexContent text={q.content} className="mt-2 text-sm" />
      <ul className="mt-3 space-y-1.5">
        {q.options.map((o) => (
          <li key={o.label} className="flex items-center gap-3 text-sm">
            <span className={cn("w-5 font-semibold", o.is_correct && "text-emerald-600 dark:text-emerald-400")}>{o.label}</span>
            <Bar percent={o.percent} tone={o.is_correct ? "bg-emerald-500" : "bg-primary/60"} />
            <span className="w-24 text-right tabular-nums text-muted-foreground">{o.percent}% · {o.count}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="w-5">—</span><Bar percent={q.blank_percent} tone="bg-muted-foreground/40" />
          <span className="w-24 text-right tabular-nums">{q.blank_percent}% · {q.blank_count}</span>
          <span className="sr-only">{t("exam.analysis.blank", "Bỏ trống")}</span>
        </li>
      </ul>
    </article>
  );
}

/**
 * Per QUESTION (not per paper number): versions are drawn at random from the bank, so "câu 1" differs between versions.
 * Each card says how many papers had the question and what share picked A, B, C…; the hardest questions come first.
 */
export function AnalysisPanel({ examId }: { examId: string }) {
  const { t } = useTranslation();
  const data = useQuery({ queryKey: ["exam", examId, "analysis"], queryFn: () => getAnalysis(examId) });
  if (data.isLoading) return <Skeleton className="h-56 rounded-2xl" />;
  if (data.isError) return <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(data.error, t("exam.analysis.failed", "Không tải được phân tích"))}</p>;
  const a = data.data!;
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        {t("exam.analysis.note", "Các mã đề được bốc ngẫu nhiên từ ngân hàng nên số thứ tự câu khác nhau giữa các mã đề. Thống kê này tính theo từng câu hỏi của ngân hàng (gộp mọi mã đề có câu đó), câu khó nhất ở đầu. Bài vi phạm không được tính.")}
      </p>
      {a.questions.length === 0 ? <EmptyState icon={<BarChart3 />} title={t("exam.analysis.empty", "Chưa có bài để phân tích")} /> : (
        <div className="grid gap-4 lg:grid-cols-2">{a.questions.map((q, i) => <Card key={q.question_id} q={q} index={i + 1} />)}</div>
      )}
    </div>
  );
}
