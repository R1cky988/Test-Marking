import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, ImagePlus, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LatexContent } from "@/components/latex/LatexContent";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { decideFlag, getResult, getResultImageUrl, scoreText, setViolation, uploadResultImage, type FlagDecision, type ResultAnswer, type ResultDetail } from "../examsSpring.api";

function gradedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN", { hour12: false });
}

/** One question: the text, every option (the right one in green, the student's wrong pick in red), the verdict and the explanation. */
function AnswerCard({ a }: { a: ResultAnswer }) {
  const { t } = useTranslation();
  const picked = new Set((a.choice ?? "").split(",").filter(Boolean));
  const right = new Set(a.correct_answer.split(",").filter(Boolean));
  const blank = picked.size === 0;
  const verdict = a.is_correct
    ? { text: t("exam.result.right", "Đúng"), cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200" }
    : blank
      ? { text: t("exam.result.blank", "Bỏ trống"), cls: "bg-muted text-muted-foreground" }
      : { text: t("exam.result.wrong", "Sai"), cls: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200" };
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{t("exam.result.questionNo", "Câu {{n}}", { n: a.order })}</h4>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict.cls}`}>{verdict.text}</span>
      </div>
      {a.question && <LatexContent text={a.question} className="text-sm" />}
      {a.options && a.options.length > 0 ? (
        <ul className="space-y-1.5">
          {a.options.map((o) => {
            const isPicked = picked.has(o.label);
            const isRight = right.has(o.label);
            const tone = isRight ? "border-emerald-400/70 bg-emerald-50 dark:bg-emerald-500/10" : isPicked ? "border-rose-400/70 bg-rose-50 dark:bg-rose-500/10" : "";
            return (
              <li key={o.label} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>
                <span className="font-semibold">{o.label}.</span>
                <LatexContent text={o.content} className="min-w-0 flex-1" />
                <span className="flex shrink-0 items-center gap-1.5 text-xs">
                  {isPicked && <span className="text-muted-foreground">{t("exam.result.yourChoice", "Bạn chọn")}</span>}
                  {isRight ? <Check className="h-4 w-4 text-emerald-600" aria-label={t("exam.result.correctOption", "Đáp án đúng")} /> : isPicked ? <X className="h-4 w-4 text-rose-500" aria-label={t("exam.result.wrong", "Sai")} /> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("exam.result.yourChoice", "Bạn chọn")}: <b>{a.choice ?? "—"}</b> · {t("exam.result.correctOption", "Đáp án đúng")}: <b>{a.correct_answer}</b></p>
      )}
      {a.explanation && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("exam.result.explanation", "Lời giải")}</p>
          <LatexContent text={a.explanation} />
        </div>
      )}
    </li>
  );
}

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
  const [penalty, setPenalty] = useState("");
  const decide = useMutation({
    mutationFn: ({ decision, points }: { decision: FlagDecision; points?: number }) => decideFlag(examId, row!.student_id, decision, points),
    onSuccess: () => { toast.success(t("exam.flag.saved", "Đã lưu quyết định")); setPenalty(""); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.flag.failed", "Không lưu được quyết định"))),
  });
  const penaltyValue = Number(penalty.replace(",", "."));
  const penaltyOk = penalty.trim() !== "" && Number.isFinite(penaltyValue) && penaltyValue > 0 && penaltyValue <= (data?.max_score ?? Infinity);
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
          <DialogDescription>{t("exam.result.desc", "Mã đề, số câu đúng, điểm, từng câu hỏi với đáp án đã chọn và lời giải.")}</DialogDescription>
        </DialogHeader>

        {!data ? <Skeleton className="h-48" /> : row && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                [t("exam.versionLabel", "Mã đề"), row.test_code ?? "—"],
                [t("exam.result.correct", "Số câu đúng"), `${row.total_correct ?? 0}/${row.total_questions ?? 0}`],
                [t("exam.result.score", "Điểm"), `${scoreText(row.total_score)}/${scoreText(data.max_score)}`],
                [t("exam.result.status", "Trạng thái"), row.is_violation ? t("exam.violation.label", "Vi phạm") : t("exam.result.ok", "Hợp lệ")],
                [t("exam.result.gradedAt", "Ngày giờ chấm"), gradedAt(row.graded_at ?? row.submitted_at)],
                ...(row.synced_at ? [
                  [t("exam.result.clientSubmittedAt", "Học sinh nộp trên điện thoại"), gradedAt(row.client_submitted_at)],
                  [t("exam.result.syncedAt", "Đồng bộ lên hệ thống"), gradedAt(row.synced_at)],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className={`text-base font-semibold tabular-nums sm:text-lg ${k === t("exam.result.status", "Trạng thái") && row.is_violation ? "text-rose-600" : ""}`}>{v}</dd></div>
              ))}
            </dl>

            {row.is_violation && (
              <p role="status" className="flex items-start gap-2 rounded-xl border border-rose-300/50 bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("exam.violation.note", "Vi phạm: bài tính 0 điểm, coi như không chọn đáp án nào.")}{row.violation_reason ? ` ${row.violation_reason}` : ""}</span>
              </p>
            )}

            {data.answers.length > 0 && (
              <section aria-label={t("exam.result.answers", "Chi tiết từng câu")}>
                <h3 className="mb-2 text-sm font-semibold">{t("exam.result.answers", "Chi tiết từng câu")}</h3>
                <ol className="space-y-3">
                  {data.answers.map((a) => <AnswerCard key={a.order} a={a} />)}
                </ol>
              </section>
            )}

            {(teacher || row.has_image) && <section aria-label={t("exam.result.photo", "Ảnh bài chấm")}>
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
            </section>}

            {row.is_flagged && (
              <section className="space-y-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="flex items-start gap-2">
                  <Flag className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t("exam.flag.note", "Học sinh bị báo vi phạm khi làm bài: {{reason}}.", { reason: row.flag_reason ?? "" })}{" "}
                    {row.flag_decision === "ZERO" ? t("exam.flag.isZero", "Đã quyết định: tính 0 điểm.")
                      : row.flag_decision === "DEDUCT" ? t("exam.flag.isDeduct", "Đã quyết định: trừ {{n}} điểm.", { n: scoreText(row.penalty_points ?? 0) })
                      : row.flag_decision === "DISMISS" ? t("exam.flag.isDismiss", "Đã quyết định: không xử lý.")
                      : t("exam.flag.pending", "Chưa quyết định: học sinh chưa thấy điểm.")}
                  </span>
                </p>
                {teacher && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="destructive" disabled={decide.isPending} onClick={() => decide.mutate({ decision: "ZERO" })}>{t("exam.flag.zero", "Tính 0 điểm")}</Button>
                    <Input value={penalty} onChange={(e) => setPenalty(e.target.value)} inputMode="decimal" className="h-8 w-24" placeholder={t("exam.flag.points", "Số điểm trừ")} aria-label={t("exam.flag.points", "Số điểm trừ")} />
                    <Button type="button" size="sm" variant="outline" disabled={decide.isPending || !penaltyOk} onClick={() => decide.mutate({ decision: "DEDUCT", points: penaltyValue })}>{t("exam.flag.deduct", "Trừ điểm")}</Button>
                    <Button type="button" size="sm" variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate({ decision: "DISMISS" })}>{t("exam.flag.dismiss", "Bỏ qua")}</Button>
                  </div>
                )}
              </section>
            )}

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
