import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ChevronRight, ClipboardList, Clock, Hourglass } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getClassExamGroups, type ClassExamItem, type ExamBucket } from "@/features/classes/classDetail.api";
import { CountPill, EmptyState, fmtDateTime } from "./shared";

const SECTIONS: { key: ExamBucket; label: string; fallback: string; dot: string; tile: string; teacherOnly?: boolean }[] = [
  { key: "ongoing", label: "classes.exams.ongoing", fallback: "Đang diễn ra", dot: "bg-emerald-500", tile: "bg-success-soft text-success-foreground" },
  { key: "upcoming", label: "classes.exams.upcoming", fallback: "Sắp diễn ra", dot: "bg-amber-500", tile: "bg-warning-soft text-warning-foreground" },
  { key: "ended", label: "classes.exams.ended", fallback: "Đã kết thúc", dot: "bg-muted-foreground/50", tile: "bg-muted text-muted-foreground" },
  { key: "draft", label: "classes.exams.draft", fallback: "Bản nháp", dot: "bg-muted-foreground/30", tile: "bg-muted text-muted-foreground", teacherOnly: true },
];

/** Calendar-style tile: the day is what people scan for. */
function DateTile({ iso, className, locale }: { iso: string | null; className: string; locale: string }) {
  const d = iso ? new Date(iso) : null;
  const valid = d && !Number.isNaN(d.getTime());
  return (
    <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl", className)} aria-hidden>
      {valid ? (
        <>
          <span className="text-[11px] font-medium leading-none">{d.toLocaleDateString(locale, { month: "short" })}</span>
          <span className="mt-0.5 text-xl font-semibold leading-none tabular-nums">{d.getDate()}</span>
        </>
      ) : (
        <Hourglass className="h-5 w-5" />
      )}
    </div>
  );
}

export function ExamsTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const query = useQuery({ queryKey: ["class-exams", classId], queryFn: () => getClassExamGroups(classId) });

  if (query.isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />;
  if (query.isError)
    return <p className="text-sm text-destructive">{getApiErrorMessage(query.error, t("classes.exams.loadFailed", { defaultValue: "Không tải được danh sách bài thi" }))}</p>;

  const groups = query.data!;
  const open = (e: ClassExamItem) => {
    // teachers manage the exam; students have no exam-detail page in this app yet
    if (isTeacher) navigate(`/exams/${e.id}`);
  };
  const visible = SECTIONS.filter((s) => !s.teacherOnly || isTeacher);
  const total = visible.reduce((n, s) => n + (groups[s.key]?.length ?? 0), 0);

  if (total === 0) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title={t("classes.exams.none", { defaultValue: "Không có bài thi" })}
        hint={isTeacher ? t("classes.exams.noneHint", { defaultValue: "Bài thi gán cho lớp này sẽ hiện ở đây, chia theo thời gian." }) : undefined}
      />
    );
  }

  return (
    <div className="space-y-8">
      {visible.map((s) => {
        const items = groups[s.key] ?? [];
        return (
          <section key={s.key} aria-label={t(s.label, { defaultValue: s.fallback })} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
              {t(s.label, { defaultValue: s.fallback })}
              <CountPill>{items.length}</CountPill>
            </h3>
            {items.length === 0 ? (
              <p className="pl-4 text-sm text-muted-foreground">{t("classes.exams.none", { defaultValue: "Không có bài thi" })}</p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {items.map((e) => (
                  <li key={e.id}>
                    <div
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border bg-card p-3.5 transition-colors",
                        isTeacher && "cursor-pointer hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring",
                      )}
                      onClick={() => open(e)}
                      onKeyDown={(ev) => { if (isTeacher && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); open(e); } }}
                      role={isTeacher ? "button" : undefined}
                      tabIndex={isTeacher ? 0 : undefined}
                    >
                      <DateTile iso={e.from_time} className={s.tile} locale={locale} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {e.from_time ? fmtDateTime(e.from_time, locale) : t("classes.exams.noTime", { defaultValue: "Chưa đặt lịch" })}
                          </span>
                          {e.duration_minutes ? <span>{e.duration_minutes} {t("classes.exams.minutes", { defaultValue: "phút" })}</span> : null}
                          {e.subject ? <span>{e.subject}</span> : null}
                        </p>
                      </div>
                      {isTeacher && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
