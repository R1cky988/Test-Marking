import { useQuery } from "@tanstack/react-query";
import { Search, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/detail/shared";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/features/questions/components/Segmented";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getParticipants, scoreText, type Participant } from "../examsSpring.api";

export type ParticipantFilter = "all" | "submitted" | "missing";

/** Everybody of the class is a participant. The filter "đã nộp" is the list opened from the statistics. */
export function ParticipantsPanel({ examId, filter, onFilter, onOpen, showSubmit }: {
  examId: string;
  filter: ParticipantFilter;
  onFilter: (f: ParticipantFilter) => void;
  onOpen: (p: Participant) => void;
  /** ONLINE / SUBMIT exams have a handed-in state; for OFFLINE the teacher marks every paper */
  showSubmit: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
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
              <tr><th className="px-4 py-3">{t("exam.col.code", "Mã số")}</th><th className="px-4 py-3">{t("exam.col.name", "Họ tên")}</th><th className="px-4 py-3">{t("exam.result.status", "Trạng thái")}</th><th className="px-4 py-3 text-right">{t("exam.result.score", "Điểm")}</th></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => {
                const clickable = p.has_result || p.is_violation;
                return (
                  <tr key={p.student_id} className={clickable ? "cursor-pointer hover:bg-muted/40" : ""} onClick={clickable ? () => onOpen(p) : undefined}>
                    <td className="px-4 py-3 font-mono text-xs">{p.student_code}</td>
                    <td className="px-4 py-3 font-medium">{clickable ? <button type="button" className="text-left hover:text-primary focus-visible:outline-2" onClick={() => onOpen(p)}>{p.full_name}</button> : p.full_name}</td>
                    <td className="px-4 py-3">
                      {p.is_violation ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-900 dark:bg-rose-500/15 dark:text-rose-200">{t("exam.violation.label", "Vi phạm")}</span>
                        : p.has_result ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">{showSubmit ? t("exam.participants.submitted", "Đã nộp") : t("exam.participants.marked", "Đã có bài")}</span>
                        : <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{showSubmit ? t("exam.participants.missing", "Chưa nộp") : t("exam.participants.none", "Chưa có bài")}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{p.has_result || p.is_violation ? scoreText(p.total_score) : "—"}</td>
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
