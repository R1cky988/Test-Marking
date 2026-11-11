import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Search, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { EmptyState } from "@/components/detail/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/features/questions/components/Segmented";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getParticipants, scoreText, timeText, unlockAttempt, type Participant } from "../examsSpring.api";

export type ParticipantFilter = "all" | "submitted" | "missing";

/** Everybody of the class is a participant. The filter "đã nộp" is the list opened from the statistics. */
export function ParticipantsPanel({ examId, filter, onFilter, onOpen, showSubmit, online = false }: {
  examId: string;
  filter: ParticipantFilter;
  onFilter: (f: ParticipantFilter) => void;
  onOpen: (p: Participant) => void;
  /** ONLINE / SUBMIT exams have a handed-in state; for OFFLINE the teacher marks every paper */
  showSubmit: boolean;
  /** ONLINE exams are taken on the phone: show the attempt state, the leaves, the sync time and the unlock button */
  online?: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const unlock = useMutation({
    mutationFn: (studentId: string) => unlockAttempt(examId, studentId),
    onSuccess: () => { toast.success(t("exam.attempt.unlocked", "Đã mở khóa, học sinh có thể làm tiếp")); void qc.invalidateQueries({ queryKey: ["exam", examId, "participants"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.attempt.unlockFailed", "Không mở khóa được"))),
  });
  const list = useQuery({ queryKey: ["exam", examId, "participants"], queryFn: () => getParticipants(examId) });
  const q = search.trim().toLowerCase();
  const rows = useMemo(() => (list.data ?? []).filter((p) =>
    (filter === "all" || (filter === "submitted" ? p.has_result : !p.has_result)) &&
    (!q || p.full_name.toLowerCase().includes(q) || p.student_code.toLowerCase().includes(q))), [list.data, filter, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<ParticipantFilter> label={t("exam.participants.filter", "Lọc thí sinh")} value={filter} onChange={onFilter} size="sm"
          options={[
            { value: "all", label: `${t("exam.participants.all", "Tất cả")} (${list.data?.length ?? 0})` },
            { value: "submitted", label: `${showSubmit ? t("exam.participants.submitted", "Đã nộp") : t("exam.participants.marked", "Đã có bài")} (${(list.data ?? []).filter((p) => p.has_result).length})` },
            { value: "missing", label: `${showSubmit ? t("exam.participants.missing", "Chưa nộp") : t("exam.participants.none", "Chưa có bài")} (${(list.data ?? []).filter((p) => !p.has_result).length})` },
          ]} />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("exam.participants.search", "Tìm tên hoặc mã số")} aria-label={t("exam.participants.search", "Tìm tên hoặc mã số")} className="rounded-full pl-9" />
        </div>
      </div>
      {list.isLoading ? <Skeleton className="h-56 rounded-2xl" /> : list.isError ? (
        <p role="alert" className="text-sm text-destructive">{getApiErrorMessage(list.error, t("exam.participants.failed", "Không tải được danh sách thí sinh"))}</p>
      ) : rows.length === 0 ? <EmptyState icon={<UserX />} title={t("exam.participants.empty", "Không có thí sinh nào")} /> : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">{t("exam.col.code", "Mã số")}</th><th className="px-4 py-3">{t("exam.col.name", "Họ tên")}</th><th className="px-4 py-3">{t("exam.result.status", "Trạng thái")}</th><th className="px-4 py-3 text-right">{t("exam.result.score", "Điểm")}</th>{online && <><th className="px-4 py-3">{t("exam.result.gradedAt", "Ngày giờ chấm")}</th><th className="px-4 py-3">{t("exam.result.syncedAt", "Đồng bộ lên hệ thống")}</th><th className="px-4 py-3" /></>}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => {
                const clickable = p.has_result || p.is_violation;
                return (
                  <tr key={p.student_id} className={clickable ? "cursor-pointer hover:bg-muted/40" : ""} onClick={clickable ? () => onOpen(p) : undefined}>
                    <td className="px-4 py-3 font-mono text-xs">{p.student_code}</td>
                    <td className="px-4 py-3 font-medium">{clickable ? <button type="button" className="text-left hover:text-primary focus-visible:outline-2" onClick={() => onOpen(p)}>{p.full_name}</button> : p.full_name}</td>
                    <td className="px-4 py-3">
                      {p.attempt_status === "LOCKED" ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t("exam.attempt.locked", "Bị khóa")}</span>
                        : p.is_flagged && !p.flag_decision ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t("exam.flag.needsDecision", "Chờ quyết định")}</span>
                        : p.flag_decision === "DEDUCT" ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t("exam.flag.deducted", "Trừ {{n}} điểm", { n: scoreText(p.penalty_points ?? 0) })}</span>
                        : p.is_violation ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-900 dark:bg-rose-500/15 dark:text-rose-200">{t("exam.violation.label", "Vi phạm")}</span>
                        : p.has_result ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">{showSubmit ? t("exam.participants.submitted", "Đã nộp") : t("exam.participants.marked", "Đã có bài")}</span>
                        : <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{showSubmit ? t("exam.participants.missing", "Chưa nộp") : t("exam.participants.none", "Chưa có bài")}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{p.has_result || p.is_violation ? scoreText(p.total_score) : "—"}</td>
                    {online && (
                      <>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{timeText(p.graded_at)}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{timeText(p.synced_at)}</td>
                        <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                          {p.attempt_status === "LOCKED" ? (
                            <Button size="sm" variant="outline" disabled={unlock.isPending} onClick={() => unlock.mutate(p.student_id)}><Lock className="mr-1 h-3.5 w-3.5" />{t("exam.attempt.unlock", "Mở khóa")}</Button>
                          ) : p.attempt_status === "IN_PROGRESS" ? <span className="text-xs text-muted-foreground">{t("exam.attempt.inProgress", "Đang làm")}{p.left_count ? ` · ${t("exam.attempt.left", "thoát {{n}} lần", { n: p.left_count })}` : ""}</span> : null}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
