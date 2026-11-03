import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getResult, getResultImageUrl, scoreText, setViolation, uploadResultImage, type ResultDetail } from "../examsSpring.api";

/** One paper: who, version, right answers, score (+ violation), the answers and the photo of the marked sheet when there is one. */
export function ResultDialog({ examId, resultId, preset, open, onOpenChange, teacher }: {
  examId: string;
  resultId: string | null;
  /** the student's own paper is already loaded */
  preset?: ResultDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageState, setImageState] = useState<"idle" | "loading" | "none">("idle");

  const detail = useQuery({
    queryKey: ["exam", examId, "result", resultId],
    queryFn: () => getResult(examId, resultId!),
    enabled: open && !!resultId && !preset && teacher,
  });
  const data = preset ?? detail.data;
  const row = data?.result;

  useEffect(() => {
    if (!open || !row?.has_image) { setImage(null); setImageState(row && open ? "none" : "idle"); return; }
    let url: string | null = null;
    let cancelled = false;
    setImageState("loading");
    getResultImageUrl(examId, row.id)
      .then((u) => { if (cancelled) { URL.revokeObjectURL(u); return; } url = u; setImage(u); setImageState("idle"); })
      .catch(() => { if (!cancelled) setImageState("none"); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [open, row?.id, row?.has_image, examId]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["exam", examId] });
  };
  const toggleViolation = useMutation({
    mutationFn: () => setViolation(examId, row!.student_id, !row!.is_violation, reason),
    onSuccess: () => { toast.success(row?.is_violation ? t("exam.violation.cleared", "Đã bỏ vi phạm") : t("exam.violation.marked", "Đã đánh dấu vi phạm")); setReason(""); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.violation.failed", "Không cập nhật được vi phạm"))),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadResultImage(examId, row!.id, file),
    onSuccess: () => { toast.success(t("exam.result.imageSaved", "Đã lưu ảnh bài chấm")); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.result.imageFailed", "Không tải được ảnh lên"))),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? `${row.full_name} · ${row.student_code}` : t("exam.result.title", "Chi tiết bài thi")}</DialogTitle>
          <DialogDescription>{t("exam.result.desc", "Mã đề, số câu đúng, điểm và đáp án đã chọn.")}</DialogDescription>
        </DialogHeader>

        {!data ? <Skeleton className="h-48" /> : row && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [t("exam.versionLabel", "Mã đề"), row.test_code ?? "—"],
                [t("exam.result.correct", "Số câu đúng"), `${row.total_correct ?? 0}/${row.total_questions ?? 0}`],
                [t("exam.result.score", "Điểm"), `${scoreText(row.total_score)}/${scoreText(data.max_score)}`],
                [t("exam.result.status", "Trạng thái"), row.is_violation ? t("exam.violation.label", "Vi phạm") : t("exam.result.ok", "Hợp lệ")],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className={`text-lg font-semibold tabular-nums ${k === t("exam.result.status", "Trạng thái") && row.is_violation ? "text-rose-600" : ""}`}>{v}</dd></div>
              ))}
            </dl>

            {row.is_violation && (
              <p role="status" className="flex items-start gap-2 rounded-xl border border-rose-300/50 bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("exam.violation.note", "Vi phạm: bài tính 0 điểm, coi như không chọn đáp án nào.")}{row.violation_reason ? ` ${row.violation_reason}` : ""}</span>
              </p>
            )}

            {data.answers.length > 0 && (
              <section aria-label={t("exam.result.answers", "Đáp án đã chọn")}>
                <h3 className="mb-2 text-sm font-semibold">{t("exam.result.answers", "Đáp án đã chọn")}</h3>
                <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {data.answers.map((a) => (
                    <li key={a.order} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-sm ${a.is_correct ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10" : "bg-card"}`}>
                      <span className="text-muted-foreground tabular-nums">{a.order}.</span>
                      <span className="font-medium">{a.choice ?? "—"}</span>
                      {a.is_correct ? <Check className="h-4 w-4 text-emerald-600" aria-label={t("exam.result.right", "đúng")} /> : <span className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-3.5 w-3.5 text-rose-500" aria-label={t("exam.result.wrong", "sai")} />{a.correct_answer}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section aria-label={t("exam.result.photo", "Ảnh bài chấm")}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("exam.result.photo", "Ảnh bài chấm")}</h3>
                {teacher && (
                  <>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("exam.result.pickImage", "Chọn ảnh bài chấm")}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
                    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={upload.isPending} onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4" />{row.has_image ? t("exam.result.replaceImage", "Thay ảnh") : t("exam.result.addImage", "Thêm ảnh")}</Button>
                  </>
                )}
              </div>
              {imageState === "loading" ? <Skeleton className="h-64" /> : image ? (
                <a href={image} target="_blank" rel="noreferrer"><img src={image} alt={t("exam.result.photoAlt", "Ảnh bài chấm của {{name}}", { name: row.full_name })} className="max-h-[70vh] w-full rounded-xl border object-contain" /></a>
              ) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("exam.result.noPhoto", "Bài này chưa có ảnh.")}</p>}
            </section>

            {teacher && (
              <section className="space-y-2 rounded-xl border p-3">
                <h3 className="text-sm font-semibold">{t("exam.violation.label", "Vi phạm")}</h3>
                {!row.is_violation && <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder={t("exam.violation.reason", "Lý do (không bắt buộc)")} aria-label={t("exam.violation.reason", "Lý do (không bắt buộc)")} />}
                <Button type="button" variant={row.is_violation ? "outline" : "destructive"} size="sm" className="gap-2" disabled={toggleViolation.isPending} onClick={() => toggleViolation.mutate()}>
                  {row.is_violation ? <><ShieldCheck className="h-4 w-4" />{t("exam.violation.clear", "Bỏ vi phạm")}</> : <><ShieldAlert className="h-4 w-4" />{t("exam.violation.mark", "Đánh dấu vi phạm (0 điểm)")}</>}
                </Button>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
