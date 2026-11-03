import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getClasses } from "@/features/classes/classes.api";
import { getQuestionBanks } from "@/features/questions/questionBanks.api";
import { getTemplates } from "@/features/templates/templates.api";
import { FORMAT_ICON, useFormatText, useResultText } from "../components/examMeta";
import { VersionGenerator } from "../components/VersionGenerator";
import {
  createExam, EXAM_FORMATS, formatNeedsTemplate, generateVersions, getExam, getVersions, publishExam, templateQuestionTotal, updateExam,
  type Exam, type ExamFormat, type ExamPayload, type ExamVersion, type GenerateVersionsPayload,
} from "../examsSpring.api";

interface FormState {
  name: string;
  subject: string;
  classId: string;
  format: ExamFormat;
  from: string;
  to: string;
  duration: string;
  showResult: boolean;
  templateId: string;
  bankId: string;
}

const EMPTY: FormState = { name: "", subject: "", classId: "", format: "OFFLINE", from: "", to: "", duration: "", showResult: true, templateId: "", bankId: "" };

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

type StepKey = "info" | "template" | "bank" | "review";

export function ExamFormPage() {
  const { t } = useTranslation();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const formatText = useFormatText();
  const resultText = useResultText();

  const [examId, setExamId] = useState<string | undefined>(routeId);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [stepIndex, setStepIndex] = useState(0);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [recipe, setRecipe] = useState<Partial<GenerateVersionsPayload>>({});
  const [loadedExam, setLoadedExam] = useState<Exam | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const classes = useQuery({ queryKey: ["classes", "teacher-options"], queryFn: () => getClasses({ role: "teacher", limit: 100 }) });
  const templates = useQuery({ queryKey: ["templates", "all"], queryFn: () => getTemplates() });
  const banks = useQuery({ queryKey: ["question-banks", ""], queryFn: () => getQuestionBanks() });
  const existing = useQuery({ queryKey: ["exam", routeId], queryFn: () => getExam(routeId!), enabled: Boolean(routeId) });

  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    setLoadedExam(e);
    setForm({
      name: e.name, subject: e.subject ?? "", classId: e.class_id, format: e.format, from: toLocalInput(e.from_time), to: toLocalInput(e.to_time),
      duration: e.duration_minutes ? String(e.duration_minutes) : "", showResult: e.show_result_immediately,
      templateId: e.template_id ?? "", bankId: e.question_bank_id ?? "",
    });
    setRecipe({ count: e.versions_count || undefined, easy: e.easy, medium: e.medium, hard: e.hard });
    void getVersions(e.id).then(setVersions).catch(() => undefined);
  }, [existing.data]);

  const needsTemplate = formatNeedsTemplate(form.format);
  const steps: StepKey[] = useMemo(() => (needsTemplate ? ["info", "template", "bank", "review"] : ["info", "bank", "review"]), [needsTemplate]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const stepLabel: Record<StepKey, string> = {
    info: t("exam.step.info", "Thông tin"), template: t("exam.step.template", "Mẫu phiếu"),
    bank: t("exam.step.bank", "Câu hỏi & mã đề"), review: t("exam.step.review", "Xem lại"),
  };

  const template = (templates.data ?? []).find((x) => x.id === form.templateId);
  const templateTotal = needsTemplate && template ? templateQuestionTotal(template.grid_config) : null;
  const bank = (banks.data ?? []).find((b) => b.id === form.bankId) ?? null;

  const payload = (): ExamPayload => ({
    name: form.name.trim(),
    subject: form.subject.trim() || undefined,
    class_id: form.classId,
    format: form.format,
    from_time: toIso(form.from),
    to_time: toIso(form.to),
    duration_minutes: form.duration ? Number.parseInt(form.duration, 10) : null,
    template_id: needsTemplate ? form.templateId || null : null,
    question_bank_id: form.bankId || null,
    show_result_immediately: form.format === "ONLINE" ? form.showResult : undefined,
  });

  const save = useMutation({
    mutationFn: () => (examId ? updateExam(examId, payload()) : createExam(payload())),
    onSuccess: (e) => { setExamId(e.id); setLoadedExam(e); void qc.invalidateQueries({ queryKey: ["exams"] }); },
  });

  const generate = useMutation({
    mutationFn: async (plan: GenerateVersionsPayload) => {
      const e = await save.mutateAsync();
      setRecipe(plan);
      return generateVersions(e.id, plan);
    },
    onSuccess: (v) => { setVersions(v); toast.success(t("exam.gen.done", "Đã tạo {{n}} mã đề", { n: v.length })); void qc.invalidateQueries({ queryKey: ["exams"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.gen.failed", "Không tạo được mã đề"))),
  });

  const publish = useMutation({
    mutationFn: async () => { const e = await save.mutateAsync(); return publishExam(e.id); },
    onSuccess: (e) => { toast.success(t("exam.published", "Đã công bố kỳ thi")); void qc.invalidateQueries({ queryKey: ["exams"] }); navigate(`/exams/${e.id}`); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.publishFailed", "Không công bố được kỳ thi"))),
  });

  function validate(): string | null {
    if (step === "info") {
      if (!form.name.trim()) return t("exam.err.name", "Hãy nhập tên kỳ thi.");
      if (!form.classId) return t("exam.err.class", "Hãy chọn lớp.");
      if (form.from && form.to && new Date(form.to) <= new Date(form.from)) return t("exam.err.time", "Thời gian kết thúc phải sau thời gian bắt đầu.");
    }
    if (step === "template" && !form.templateId) return t("exam.err.template", "Kỳ thi này cần một mẫu phiếu.");
    if (step === "bank" && !form.bankId) return t("exam.err.bank", "Hãy chọn ngân hàng câu hỏi.");
    return null;
  }

  async function next() {
    const problem = validate();
    if (problem) { toast.error(problem); return; }
    // Paper exams need a sheet template to be saved; it is chosen on the next step, so the first
    // step only moves on and the exam is stored once the template is picked.
    const waitForTemplate = step === "info" && needsTemplate && !form.templateId;
    try {
      if (!waitForTemplate) await save.mutateAsync();
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("exam.saveFailed", "Không lưu được kỳ thi")));
    }
  }

  const loading = Boolean(routeId) && existing.isLoading;
  const locked = loadedExam != null && loadedExam.status !== "DRAFT";
  const busy = save.isPending || generate.isPending || publish.isPending;

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  if (locked) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border p-8 text-center">
        <p className="font-medium">{t("exam.locked", "Kỳ thi đã công bố nên không sửa được nữa.")}</p>
        <Button asChild className="mt-4"><Link to={`/exams/${loadedExam.id}`}>{t("exam.backToExam", "Về kỳ thi")}</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/exams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("exam.title", "Kỳ thi")}</Link>
        <h1 className="mt-2 text-3xl font-semibold">{routeId ? t("exam.edit", "Sửa kỳ thi") : t("exam.new", "Tạo kỳ thi")}</h1>
      </div>

      <ol className="flex items-center gap-2 overflow-x-auto p-1.5" aria-label={t("exam.steps", "Các bước")}>
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2" aria-current={i === stepIndex ? "step" : undefined}>
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i < stepIndex ? "bg-primary text-primary-foreground" : i === stepIndex ? "bg-primary/15 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground")}>
              {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("whitespace-nowrap text-sm", i === stepIndex ? "font-medium" : "text-muted-foreground")}>{stepLabel[s]}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
        {step === "info" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="ex-name">{t("exam.field.name", "Tên kỳ thi")} <span className="text-destructive">*</span></Label>
              <Input id="ex-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={255} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ex-subject">{t("exam.field.subject", "Môn học")}</Label>
                <Input id="ex-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("exam.field.class", "Lớp")} <span className="text-destructive">*</span></Label>
                <Select value={form.classId} onValueChange={(v) => set("classId", v)}>
                  <SelectTrigger aria-label={t("exam.field.class", "Lớp")}><SelectValue placeholder={t("exam.pickClass", "Chọn lớp")} /></SelectTrigger>
                  <SelectContent>{(classes.data?.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">{t("exam.field.format", "Loại kỳ thi")}</legend>
              <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("exam.field.format", "Loại kỳ thi")}>
                {EXAM_FORMATS.map((f) => {
                  const active = form.format === f;
                  return (
                    <button key={f} type="button" role="radio" aria-checked={active} onClick={() => set("format", f)}
                      className={cn("flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors", active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50")}>
                      <span className="flex items-center gap-2 font-medium">{FORMAT_ICON[f]}{formatText(f).name}</span>
                      <span className="text-xs text-muted-foreground">{formatText(f).hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {form.format === "ONLINE" && (
              <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <div>
                  <Label htmlFor="ex-show" className="font-medium">{t("exam.field.showResult", "Hiện kết quả ngay sau khi nộp")}</Label>
                  <p className="text-xs text-muted-foreground">{t("exam.field.showResultHint", "Tắt nếu muốn công bố kết quả sau.")}</p>
                </div>
                <Switch id="ex-show" checked={form.showResult} onCheckedChange={(v) => set("showResult", v)} />
              </div>
            )}
            {form.format !== "ONLINE" && <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{resultText({ result_policy: "AFTER_TEACHER_PUBLISH" })}.</p>}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="ex-from">{t("exam.field.from", "Bắt đầu")}</Label><Input id="ex-from" type="datetime-local" value={form.from} onChange={(e) => set("from", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="ex-to">{t("exam.field.to", "Kết thúc")}</Label><Input id="ex-to" type="datetime-local" value={form.to} onChange={(e) => set("to", e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="ex-dur">{t("exam.field.duration", "Thời lượng (phút)")}</Label><Input id="ex-dur" type="number" min={1} value={form.duration} onChange={(e) => set("duration", e.target.value)} /></div>
            </div>
          </>
        )}

        {step === "template" && (
          <>
            <div>
              <h2 className="text-lg font-semibold">{t("exam.step.template", "Mẫu phiếu")}</h2>
              <p className="text-sm text-muted-foreground">{t("exam.tpl.hint", "Mẫu đã dùng trong kỳ thi sẽ bị khóa, không sửa được định dạng nữa. Mã học sinh cố định 8 chữ số, mã đề cố định 3 ô.")}</p>
            </div>
            {templates.isLoading ? <Skeleton className="h-24" /> : (templates.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("exam.tpl.none", "Bạn chưa có mẫu phiếu nào.")} <Link to="/templates" className="text-primary underline">{t("exam.tpl.create", "Tạo mẫu phiếu")}</Link></p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("exam.step.template", "Mẫu phiếu")}>
                {(templates.data ?? []).map((tpl) => {
                  const active = form.templateId === tpl.id;
                  return (
                    <button key={tpl.id} type="button" role="radio" aria-checked={active} onClick={() => set("templateId", tpl.id)}
                      className={cn("rounded-xl border p-3 text-left transition-colors", active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50")}>
                      <span className="block font-medium">{tpl.name}</span>
                      <span className="text-xs text-muted-foreground">{templateQuestionTotal(tpl.grid_config)} {t("exam.questionsShort", "câu")}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === "bank" && (
          <>
            <div className="space-y-1.5">
              <Label>{t("exam.field.bank", "Ngân hàng câu hỏi")} <span className="text-destructive">*</span></Label>
              <Select value={form.bankId} onValueChange={(v) => set("bankId", v)}>
                <SelectTrigger aria-label={t("exam.field.bank", "Ngân hàng câu hỏi")}><SelectValue placeholder={t("exam.pickBank", "Chọn ngân hàng")} /></SelectTrigger>
                <SelectContent>{(banks.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.items_count})</SelectItem>)}</SelectContent>
              </Select>
              {bank && <p className="text-xs text-muted-foreground">{t("exam.bankCounts", "Dễ {{e}} · Trung bình {{m}} · Khó {{h}}", { e: bank.difficulty_counts.easy, m: bank.difficulty_counts.medium, h: bank.difficulty_counts.hard })}</p>}
            </div>
            {bank && (
              <VersionGenerator bank={bank.difficulty_counts} templateTotal={templateTotal} versions={versions} initial={recipe} busy={busy} onGenerate={(p) => generate.mutate(p)} />
            )}
          </>
        )}

        {step === "review" && (
          <>
            <h2 className="text-lg font-semibold">{t("exam.step.review", "Xem lại")}</h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Row k={t("exam.field.name", "Tên kỳ thi")} v={form.name} />
              <Row k={t("exam.field.class", "Lớp")} v={(classes.data?.data ?? []).find((c) => c.id === form.classId)?.class_name ?? ""} />
              <Row k={t("exam.field.format", "Loại kỳ thi")} v={formatText(form.format).name} />
              <Row k={t("exam.field.result", "Kết quả")} v={resultText({ result_policy: form.format === "ONLINE" && form.showResult ? "IMMEDIATE" : "AFTER_TEACHER_PUBLISH" })} />
              {needsTemplate && <Row k={t("exam.step.template", "Mẫu phiếu")} v={template ? `${template.name} (${templateTotal} ${t("exam.questionsShort", "câu")})` : ""} />}
              <Row k={t("exam.field.bank", "Ngân hàng câu hỏi")} v={bank?.name ?? ""} />
              <Row k={t("exam.versions", "Mã đề")} v={versions.length ? versions.map((v) => v.code).join(", ") : t("exam.noVersions", "Chưa có mã đề")} />
            </dl>
            {versions.length === 0 && <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{t("exam.needVersions", "Cần tạo ít nhất một mã đề trước khi công bố. Bạn có thể quay lại bước trước hoặc lưu nháp.")}</p>}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={stepIndex === 0 || busy} onClick={() => setStepIndex((i) => Math.max(0, i - 1))} className="gap-2"><ArrowLeft className="h-4 w-4" />{t("exam.back", "Quay lại")}</Button>
        {step !== "review" ? (
          <Button type="button" disabled={busy} onClick={() => void next()} className="gap-2">{t("exam.continue", "Tiếp tục")}<ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={busy || !examId} onClick={() => navigate(`/exams/${examId}`)}>{t("exam.saveDraft", "Lưu nháp")}</Button>
            <Button type="button" disabled={busy || versions.length === 0} onClick={() => publish.mutate()} className="gap-2"><Rocket className="h-4 w-4" />{t("exam.publish", "Công bố kỳ thi")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>;
}