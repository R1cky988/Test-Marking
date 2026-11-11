import { useQuery } from "@tanstack/react-query";
import { Hourglass, Smartphone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getMyResult, scoreText, type Exam } from "../examsSpring.api";
import { ResultDialog } from "./ResultDialog";

/**
 * What a student sees: the exam, its state and times, and - only once the results are released - his own paper in detail
 * (score, right answers, when it was marked, every question with his choice and the explanation). Never the score spread of the class.
 */
export function StudentExamView({ exam }: { exam: Exam }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const mine = useQuery({ queryKey: ["exam", exam.id, "my-result"], queryFn: () => getMyResult(exam.id) });
  const released = exam.results_released;
  const detail = mine.data?.detail;

  return (
    <div className="space-y-6">
      {exam.format === "ONLINE" && (
        <p role="note" className="flex items-start gap-3 rounded-2xl border bg-muted/50 p-4 text-sm">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("exam.student.phoneOnly", "Bài thi online chỉ làm được trên ứng dụng TestMarking trên điện thoại, không làm trên web.")}</span>
        </p>
      )}
      {released && mine.data?.pending_review && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border bg-muted/50 p-4 text-sm">
          <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("exam.student.pendingReview", "Giáo viên đang xem xét bài của bạn. Điểm sẽ hiển thị sau khi giáo viên quyết định.")}</span>
        </p>
      )}
      {!released && (
        <p role="status" className="flex items-start gap-3 rounded-2xl border bg-muted/50 p-4 text-sm">
          <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("exam.student.notReleased", "Kết quả chưa được công bố. Giáo viên sẽ công bố sau khi chấm xong.")}{mine.data?.submitted && ` ${t("exam.student.submitted", "Bài của bạn đã được ghi nhận.")}`}</span>
        </p>
      )}

      {released && (
        <section className="rounded-2xl border bg-card p-5" aria-label={t("exam.student.mine", "Bài thi của bạn")}>
          <h2 className="mb-3 text-lg font-semibold">{t("exam.student.mine", "Bài thi của bạn")}</h2>
          {mine.isLoading ? <Skeleton className="h-20" /> : mine.isError ? <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(mine.error, t("exam.student.failed", "Không tải được bài thi"))}</p> : !detail ? (
            mine.data?.pending_review ? null : <p className="text-sm text-muted-foreground">{t("exam.student.noPaper", "Bạn chưa có bài thi nào trong kỳ thi này.")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div><p className="text-xs text-muted-foreground">{t("exam.result.score", "Điểm")}</p><p className="text-3xl font-semibold tabular-nums">{scoreText(detail.result.total_score)}<span className="text-base font-normal text-muted-foreground">/{scoreText(detail.max_score)}</span></p></div>
              <div><p className="text-xs text-muted-foreground">{t("exam.result.correct", "Số câu đúng")}</p><p className="text-xl font-semibold tabular-nums">{detail.result.total_correct ?? 0}/{detail.result.total_questions ?? 0}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("exam.versionLabel", "Mã đề")}</p><p className="text-xl font-semibold tabular-nums">{detail.result.test_code ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("exam.result.gradedAt", "Ngày giờ chấm")}</p><p className="text-base font-semibold tabular-nums">{detail.result.submitted_at ? new Date(detail.result.submitted_at).toLocaleString("vi-VN", { hour12: false }) : "—"}</p></div>
              <Button type="button" variant="outline" className="ml-auto" onClick={() => setOpen(true)}>{t("exam.student.detail", "Xem chi tiết bài thi")}</Button>
            </div>
          )}
        </section>
      )}

      {detail && <ResultDialog examId={exam.id} resultId={detail.result.id} preset={detail} open={open} onOpenChange={setOpen} teacher={false} />}
    </div>
  );
}
