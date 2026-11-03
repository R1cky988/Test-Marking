import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { EmptyState } from "@/components/detail/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getParticipants, getViolations, setViolation, type ResultRow } from "../examsSpring.api";

/** Students who broke the rules: their paper counts 0 points, as if they had chosen nothing. The teacher can undo it. */
export function ViolationsPanel({ examId, onOpen }: { examId: string; onOpen: (r: ResultRow) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [student, setStudent] = useState("");
  const [reason, setReason] = useState("");
  const list = useQuery({ queryKey: ["exam", examId, "violations"], queryFn: () => getViolations(examId) });
  const people = useQuery({ queryKey: ["exam", examId, "participants"], queryFn: () => getParticipants(examId), enabled: adding });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["exam", examId] });

  const mark = useMutation({
    mutationFn: () => setViolation(examId, student, true, reason),
    onSuccess: () => { toast.success(t("exam.violation.marked", "Đã đánh dấu vi phạm")); setAdding(false); setStudent(""); setReason(""); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.violation.failed", "Không cập nhật được vi phạm"))),
  });
  const clear = useMutation({
    mutationFn: (r: ResultRow) => setViolation(examId, r.student_id, false),
    onSuccess: () => { toast.success(t("exam.violation.cleared", "Đã bỏ vi phạm")); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.violation.failed", "Không cập nhật được vi phạm"))),
  });

  const rows = list.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("exam.violation.rule", "Học sinh vi phạm bị 0 điểm, coi như không chọn đáp án nào.")}</p>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setAdding(true)}><ShieldAlert className="h-4 w-4" />{t("exam.violation.add", "Đánh dấu vi phạm")}</Button>
      </div>
      {list.isLoading ? <Skeleton className="h-40 rounded-2xl" /> : rows.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={t("exam.violation.empty", "Chưa có học sinh vi phạm")} />
      ) : (
        <ul className="divide-y rounded-2xl border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(r)}>
                <span className="block truncate font-medium hover:text-primary">{r.full_name} <span className="font-mono text-xs text-muted-foreground">{r.student_code}</span></span>
                <span className="block truncate text-sm text-muted-foreground">{r.violation_reason || t("exam.violation.noReason", "Không ghi lý do")}</span>
              </button>
              <Button type="button" variant="outline" size="sm" disabled={clear.isPending} onClick={() => clear.mutate(r)}>{t("exam.violation.clear", "Bỏ vi phạm")}</Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("exam.violation.add", "Đánh dấu vi phạm")}</DialogTitle><DialogDescription>{t("exam.violation.rule", "Học sinh vi phạm bị 0 điểm, coi như không chọn đáp án nào.")}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("exam.record.student", "Học sinh")}</Label>
              <Select value={student} onValueChange={setStudent}>
                <SelectTrigger aria-label={t("exam.record.student", "Học sinh")}><SelectValue placeholder={t("exam.record.pickStudent", "Chọn học sinh")} /></SelectTrigger>
                <SelectContent>{(people.data ?? []).filter((p) => !p.is_violation).map((p) => <SelectItem key={p.student_id} value={p.student_id}>{p.student_code} · {p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="vi-reason">{t("exam.violation.reason", "Lý do (không bắt buộc)")}</Label><Input id="vi-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>{t("common.cancel", "Hủy")}</Button>
            <Button type="button" variant="destructive" disabled={!student || mark.isPending} onClick={() => mark.mutate()}>{t("exam.violation.mark", "Đánh dấu vi phạm (0 điểm)")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
