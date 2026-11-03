import { useQuery } from "@tanstack/react-query";
import { FileText, ImageIcon, Pencil, Sheet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import { EmptyState } from "@/components/detail/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { downloadExamExcel, getResults, scoreText, type Exam, type ResultRow } from "../examsSpring.api";

/** "Chi tiết bài thi": one line per paper (name, code, right answers, score; a violation is flagged at the end). Export: PDF with photos for paper exams, Excel for ONLINE. */
export function ResultsPanel({ exam, onOpen, onRecord }: { exam: Exam; onOpen: (r: ResultRow) => void; onRecord: () => void }) {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: ["exam", exam.id, "results"], queryFn: () => getResults(exam.id) });
  const rows = list.data ?? [];
  const paper = exam.format !== "ONLINE";

  async function excel() {
    try { await downloadExamExcel(exam.name, rows); } catch (e) { toast.error(getApiErrorMessage(e, t("exam.export.failed", "Không xuất được file"))); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("exam.results.count", "{{n}} bài thi", { n: rows.length })}</p>
        <div className="flex flex-wrap gap-2">
          {exam.status !== "DRAFT" && <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRecord}><Pencil className="h-4 w-4" />{t("exam.record.open", "Nhập bài làm")}</Button>}
          {paper ? (
            <Button asChild variant="outline" size="sm" className="gap-2"><Link to={`/exams/${exam.id}/export`}><FileText className="h-4 w-4" />{t("exam.export.pdf", "Xuất PDF (có ảnh)")}</Link></Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className="gap-2" disabled={rows.length === 0} onClick={() => void excel()}><Sheet className="h-4 w-4" />{t("exam.export.excel", "Xuất Excel")}</Button>
          )}
        </div>
      </div>
      {list.isLoading ? <Skeleton className="h-56 rounded-2xl" /> : list.isError ? (
        <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(list.error, t("exam.results.failed", "Không tải được danh sách bài thi"))}</p>
      ) : rows.length === 0 ? <EmptyState icon={<FileText />} title={t("exam.results.empty", "Chưa có bài thi nào")} hint={t("exam.results.emptyHint", "Bài sẽ xuất hiện khi có học sinh nộp hoặc bạn nhập bài làm.")} /> : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">{t("exam.col.name", "Họ tên")}</th><th className="px-4 py-3">{t("exam.col.code", "Mã số")}</th><th className="px-4 py-3">{t("exam.versionLabel", "Mã đề")}</th><th className="px-4 py-3 text-right">{t("exam.result.correct", "Số câu đúng")}</th><th className="px-4 py-3 text-right">{t("exam.result.score", "Điểm")}</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpen(r)}>
                  <td className="px-4 py-3 font-medium"><button type="button" className="text-left hover:text-primary focus-visible:outline-2" onClick={(e) => { e.stopPropagation(); onOpen(r); }}>{r.full_name}</button></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.student_code}</td>
                  <td className="px-4 py-3 tabular-nums">{r.test_code ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.total_correct ?? 0}/{r.total_questions ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{scoreText(r.total_score)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-2">
                      {r.has_image && <ImageIcon className="h-4 w-4 text-muted-foreground" aria-label={t("exam.result.photo", "Ảnh bài chấm")} />}
                      {r.is_violation && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-900 dark:bg-rose-500/15 dark:text-rose-200">{t("exam.violation.label", "Vi phạm")}</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
