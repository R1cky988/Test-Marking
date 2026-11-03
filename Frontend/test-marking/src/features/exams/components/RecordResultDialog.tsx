import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getParticipants, getVersions, recordResult } from "../examsSpring.api";

const LABELS = ["A", "B", "C", "D", "E"];

/** The teacher types the choices of one paper; the server scores it against the version. Also the way to correct a paper. */
export function RecordResultDialog({ examId, open, onOpenChange, studentId }: { examId: string; open: boolean; onOpenChange: (o: boolean) => void; studentId?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [student, setStudent] = useState("");
  const [version, setVersion] = useState("");
  const [picked, setPicked] = useState<Record<number, string[]>>({});

  const people = useQuery({ queryKey: ["exam", examId, "participants"], queryFn: () => getParticipants(examId), enabled: open });
  const versions = useQuery({ queryKey: ["exam", examId, "versions"], queryFn: () => getVersions(examId), enabled: open });

  useEffect(() => { if (open) { setStudent(studentId ?? ""); setPicked({}); } }, [open, studentId]);
  useEffect(() => { if (open && !version && versions.data?.length === 1) setVersion(versions.data[0].code); }, [open, version, versions.data]);

  const current = versions.data?.find((v) => v.code === version);
  const toggle = (order: number, label: string) => setPicked((p) => {
    const now = new Set(p[order] ?? []);
    if (now.has(label)) now.delete(label); else now.add(label);
    return { ...p, [order]: [...now].sort() };
  });

  const save = useMutation({
    mutationFn: () => recordResult(examId, {
      student_id: student, test_code: version,
      answers: Object.entries(picked).filter(([, v]) => v.length > 0).map(([order, v]) => ({ order: Number(order), choice: v.join(",") })),
    }),
    onSuccess: (r) => {
      toast.success(t("exam.record.saved", "Đã chấm: {{c}}/{{n}} câu đúng, {{s}} điểm", { c: r.result.total_correct, n: r.result.total_questions, s: r.result.total_score }));
      void qc.invalidateQueries({ queryKey: ["exam", examId] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.record.failed", "Không lưu được bài làm"))),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("exam.record.title", "Nhập bài làm")}</DialogTitle>
          <DialogDescription>{t("exam.record.desc", "Chọn học sinh, mã đề và đáp án đã chọn; hệ thống tự chấm. Nhập lại để sửa bài.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("exam.record.student", "Học sinh")}</Label>
            <Select value={student} onValueChange={setStudent}>
              <SelectTrigger aria-label={t("exam.record.student", "Học sinh")}><SelectValue placeholder={t("exam.record.pickStudent", "Chọn học sinh")} /></SelectTrigger>
              <SelectContent>{(people.data ?? []).map((p) => <SelectItem key={p.student_id} value={p.student_id}>{p.student_code} · {p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("exam.versionLabel", "Mã đề")}</Label>
            <Select value={version} onValueChange={(v) => { setVersion(v); setPicked({}); }}>
              <SelectTrigger aria-label={t("exam.versionLabel", "Mã đề")}><SelectValue placeholder={t("exam.record.pickVersion", "Chọn mã đề")} /></SelectTrigger>
              <SelectContent>{(versions.data ?? []).map((v) => <SelectItem key={v.id} value={v.code}>{v.code} ({v.question_count} {t("exam.questionsShort", "câu")})</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {current && (
          <ol className="grid gap-2 sm:grid-cols-2" aria-label={t("exam.record.answers", "Đáp án đã chọn")}>
            {Array.from({ length: current.question_count }, (_, i) => i + 1).map((order) => (
              <li key={order} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5">
                <span className="w-8 text-sm text-muted-foreground tabular-nums">{order}.</span>
                <span className="flex gap-1" role="group" aria-label={t("exam.record.question", "Câu {{n}}", { n: order })}>
                  {LABELS.map((l) => {
                    const on = (picked[order] ?? []).includes(l);
                    return <button key={l} type="button" aria-pressed={on} onClick={() => toggle(order, l)} className={cn("h-8 w-8 rounded-full border text-sm font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{l}</button>;
                  })}
                </span>
              </li>
            ))}
          </ol>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Hủy")}</Button>
          <Button type="button" disabled={!student || !version || save.isPending} onClick={() => save.mutate()}>{t("exam.record.save", "Chấm và lưu")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
