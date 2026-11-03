import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { LatexContent } from "@/components/latex/LatexContent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getVersion, getVersions, type Exam, type ExamVersion } from "../examsSpring.api";

export function VersionsPanel({ exam }: { exam: Exam }) {
  const { t } = useTranslation();
  const [viewing, setViewing] = useState<ExamVersion | null>(null);
  const versions = useQuery({ queryKey: ["exam", exam.id, "versions"], queryFn: () => getVersions(exam.id) });
  const detail = useQuery({ queryKey: ["exam", exam.id, "version", viewing?.id], queryFn: () => getVersion(exam.id, viewing!.id), enabled: viewing !== null });
  const list = versions.data ?? [];
  const draft = exam.status === "DRAFT";
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{t("exam.versions", "Mã đề")} <span className="text-sm font-normal text-muted-foreground">({list.length})</span></h2>
        {exam.questions_per_version > 0 && <span className="text-sm text-muted-foreground">{exam.questions_per_version} {t("exam.questionsShort", "câu")} · {exam.easy}/{exam.medium}/{exam.hard}</span>}
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("exam.noVersions", "Chưa có mã đề")}. {draft && <Link to={`/exams/${exam.id}/edit`} className="text-primary underline">{t("exam.makeVersions", "Tạo mã đề")}</Link>}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <div>
                <p className="text-xl font-semibold tabular-nums">{v.code}</p>
                <p className="text-xs text-muted-foreground">{v.question_count} {t("exam.questionsShort", "câu")} · {t("exam.gen.easyShort", "dễ")} {v.easy} · {t("exam.gen.mediumShort", "TB")} {v.medium} · {t("exam.gen.hardShort", "khó")} {v.hard}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewing(v)} aria-label={t("exam.viewVersion", "Xem mã đề {{code}}", { code: v.code })}><Eye className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={viewing !== null} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("exam.versionTitle", "Mã đề {{code}}", { code: viewing?.code ?? "" })}</DialogTitle></DialogHeader>
          {detail.isLoading ? <Skeleton className="h-48" /> : (
            <ol className="space-y-5">
              {(detail.data?.questions ?? []).map((q) => (
                <li key={q.question_id} className="text-sm">
                  <div className="flex gap-2"><span className="font-semibold">{q.order}.</span><LatexContent text={q.content} /></div>
                  <ul className="mt-2 grid gap-1 pl-6 sm:grid-cols-2">
                    {q.options.map((o) => (
                      <li key={o.label} className={q.correct_answers.includes(o.label) ? "font-medium text-emerald-700 dark:text-emerald-300" : ""}><span className="mr-1.5 font-semibold">{o.label}.</span><span className="inline-block align-top"><LatexContent text={o.content} /></span></li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
