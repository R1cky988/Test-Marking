import { useQuery } from "@tanstack/react-query";
import { Hourglass, ShieldAlert, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getMyResult, scoreText, type Exam } from "../examsSpring.api";

/**
 * What a student sees: the exam, its state and times, and - only once the results are released - his own result: score,
 * right answers, version, when it was marked. Not the answers question by question, and never the score spread of the class.
 * A paper that was recorded as a violation shows the violation instead of a score.
 */
export function StudentExamView({ exam }: { exam: Exam }) {
  const { t } = useTranslation();
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
            <p className="text-sm text-muted-foreground">{t("exam.student.noPaper", "Bạn chưa có bài thi nào trong kỳ thi này.")}</p>
          ) : detail.result.is_violation ? (
            <p role="status" className="flex items-start gap-2 text-sm font-medium text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("exam.student.violation", "Bài của bạn bị ghi vi phạm{{reason}}, tính 0 điểm.", { reason: detail.result.violation_reason ? ` (${detail.result.violation_reason})` : "" })}</span>
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div><p className="text-xs text-muted-foreground">{t("exam.result.score", "Điểm")}</p><p className="text-3xl font-semibold tabular-nums">{scoreText(detail.result.total_score)}<span className="text-base font-normal text-muted-foreground">/{scoreText(detail.max_score)}</span></p></div>
              <div><p className="text-xs text-muted-foreground">{t("exam.result.correct", "Số câu đúng")}</p><p className="text-xl font-semibold tabular-nums">{detail.result.total_correct ?? 0}/{detail.result.total_questions ?? 0}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("exam.versionLabel", "Mã đề")}</p><p className="text-xl font-semibold tabular-nums">{detail.result.test_code ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("exam.result.gradedAt", "Ngày giờ chấm")}</p><p className="text-base font-semibold tabular-nums">{detail.result.submitted_at ? new Date(detail.result.submitted_at).toLocaleString("vi-VN", { hour12: false }) : "—"}</p></div>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
