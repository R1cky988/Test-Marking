import { CheckSquare, ChevronDown, CircleDot, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LatexContent } from "@/components/latex/LatexContent";
import { LatexEditor } from "@/components/latex/LatexEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { MAX_OPTIONS, OPTION_LABELS, type QuestionBankItem, type QuestionBankItemInput, type QuestionDifficulty } from "../questionBanks.api";
import {
  addOption, emptyForm, formFromItem, removeOption, setOption, setType, toggleCorrect, toInput, validate,
  type QuestionForm, type QuestionFormError,
} from "../questionForm";
import { DIFFICULTY_TONE, useDifficultyLabel } from "./questionMeta";
import { Segmented } from "./Segmented";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = a new question. */
  item: QuestionBankItem | null;
  saving: boolean;
  onSave: (input: QuestionBankItemInput) => void;
}

export function QuestionEditorDialog({ open, onOpenChange, item, saving, onSave }: Props) {
  const { t } = useTranslation();
  const difficultyLabel = useDifficultyLabel();
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [errors, setErrors] = useState<QuestionFormError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [revealAnswer, setRevealAnswer] = useState(true);

  // a fresh form every time the dialog opens
  useEffect(() => {
    if (!open) return;
    const next = item ? formFromItem(item) : emptyForm();
    setForm(next);
    setErrors([]);
    setShowErrors(false);
    setShowSolution(Boolean(next.explanation));
    setRevealAnswer(true);
  }, [open, item]);

  const live = useMemo(() => validate(form), [form]);
  const shown = showErrors ? live : errors;
  const has = (e: QuestionFormError) => shown.includes(e);

  function patch(next: QuestionForm) {
    setForm(next);
    if (showErrors) setErrors(validate(next));
  }

  function submit() {
    const found = validate(form);
    setErrors(found);
    setShowErrors(true);
    if (found.length === 0) onSave(toInput(form));
  }

  const message: Record<QuestionFormError, string> = {
    content: t("qb.editor.errors.content", "Hãy nhập nội dung câu hỏi."),
    options_min: t("qb.editor.errors.optionsMin", "Cần ít nhất 2 đáp án."),
    option_empty: t("qb.editor.errors.optionEmpty", "Có đáp án đang để trống: hãy nhập hoặc xóa nó."),
    correct_none: t("qb.editor.errors.correctNone", "Hãy chọn đáp án đúng (bấm vào chữ cái bên trái đáp án)."),
    correct_single: t("qb.editor.errors.correctSingle", "Câu một đáp án chỉ có một đáp án đúng."),
  };

  const multiple = form.type === "MULTIPLE";
  const previewOptions = form.options.map((text, i) => ({ text, i })).filter((o) => o.text.trim() !== "" || o.i < 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-6xl gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>{item ? t("qb.editor.editTitle", "Sửa câu hỏi") : t("qb.editor.createTitle", "Thêm câu hỏi")}</DialogTitle>
          <DialogDescription>
            {t("qb.editor.hint", "Viết công thức bằng LaTeX: $x^2$ trong dòng, $$\\frac{a}{b}$$ để căn giữa. Bấm \"Công thức\" để chèn ký hiệu.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* ─── form ─── */}
          <div className="space-y-6 px-6 py-5">
            <section className="space-y-2">
              <Label>{t("qb.editor.type", "Loại câu hỏi")}</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  label={t("qb.editor.type", "Loại câu hỏi")}
                  value={form.type}
                  onChange={(v) => patch(setType(form, v))}
                  options={[
                    { value: "SINGLE", label: <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5" />{t("qb.type.single", "Một đáp án")}</span> },
                    { value: "MULTIPLE", label: <span className="inline-flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" />{t("qb.type.multiple", "Nhiều đáp án")}</span> },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  {multiple ? t("qb.editor.typeHintMultiple", "Học sinh chọn tất cả đáp án đúng.") : t("qb.editor.typeHintSingle", "Học sinh chỉ chọn một đáp án đúng.")}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="qb-content">{t("qb.editor.content", "Nội dung câu hỏi")}</Label>
              <LatexEditor
                id="qb-content"
                value={form.content}
                onChange={(v) => patch({ ...form, content: v })}
                preview={false}
                minRows={4}
                invalid={has("content")}
                placeholder={t("qb.editor.contentPlaceholder", "Ví dụ: Tính giá trị của $\\int_0^1 x^2\\,dx$")}
              />
              {has("content") && <p className="text-xs text-destructive">{message.content}</p>}
            </section>

            <section className="space-y-2">
              <div className="flex items-end justify-between">
                <Label>{t("qb.editor.options", "Các đáp án")}</Label>
                <span className="text-xs text-muted-foreground">
                  {multiple ? t("qb.editor.optionsHintMultiple", "Bấm chữ cái để đánh dấu các đáp án đúng") : t("qb.editor.optionsHintSingle", "Bấm chữ cái để chọn đáp án đúng")}
                </span>
              </div>
              <ul className="space-y-2.5">
                {form.options.map((text, i) => {
                  const correct = form.correct.includes(i);
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <button
                        type="button"
                        role={multiple ? "checkbox" : "radio"}
                        aria-checked={correct}
                        aria-label={t("qb.editor.markCorrect", "Đáp án {{label}} là đáp án đúng", { label: OPTION_LABELS[i] })}
                        onClick={() => patch(toggleCorrect(form, i))}
                        className={cn(
                          "mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center border-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          multiple ? "rounded-lg" : "rounded-full",
                          correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background text-muted-foreground hover:border-emerald-400",
                        )}
                      >
                        {OPTION_LABELS[i]}
                      </button>
                      <LatexEditor
                        className="min-w-0 flex-1"
                        compact
                        preview={false}
                        minRows={1}
                        maxRows={6}
                        aria-label={t("qb.editor.optionLabel", "Đáp án {{label}}", { label: OPTION_LABELS[i] })}
                        value={text}
                        onChange={(v) => patch(setOption(form, i, v))}
                        placeholder={t("qb.editor.optionPlaceholder", "Đáp án {{label}}", { label: OPTION_LABELS[i] })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-1 h-8 w-8 shrink-0 text-muted-foreground"
                        disabled={form.options.length <= 2}
                        onClick={() => patch(removeOption(form, i))}
                        aria-label={t("qb.editor.removeOption", "Xóa đáp án {{label}}", { label: OPTION_LABELS[i] })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
              {(has("options_min") || has("option_empty") || has("correct_none") || has("correct_single")) && (
                <div role="alert" className="space-y-0.5 text-xs text-destructive">
                  {(["options_min", "option_empty", "correct_none", "correct_single"] as const).filter(has).map((e) => <p key={e}>{message[e]}</p>)}
                </div>
              )}
              {form.options.length < MAX_OPTIONS && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => patch(addOption(form))}>
                  <Plus className="h-4 w-4" />
                  {t("qb.editor.addOption", "Thêm đáp án")}
                </Button>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("qb.editor.difficulty", "Độ khó")}</Label>
                <div>
                  <Segmented<QuestionDifficulty>
                    label={t("qb.editor.difficulty", "Độ khó")}
                    value={form.difficulty}
                    onChange={(v) => patch({ ...form, difficulty: v })}
                    size="sm"
                    options={(["EASY", "MEDIUM", "HARD"] as const).map((d) => ({
                      value: d,
                      label: <span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", DIFFICULTY_TONE[d].dot)} />{difficultyLabel(d)}</span>,
                    }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <button type="button" onClick={() => setShowSolution((v) => !v)} aria-expanded={showSolution} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showSolution && "rotate-180")} />
                {t("qb.editor.solution", "Lời giải (không bắt buộc)")}
              </button>
              {showSolution && (
                <LatexEditor
                  value={form.explanation}
                  onChange={(v) => patch({ ...form, explanation: v })}
                  preview={false}
                  minRows={3}
                  aria-label={t("qb.editor.solution", "Lời giải (không bắt buộc)")}
                  placeholder={t("qb.editor.solutionPlaceholder", "Giải thích vì sao đáp án đúng...")}
                />
              )}
            </section>
          </div>

          {/* ─── preview as the student sees it ─── */}
          <aside className="border-t bg-muted/30 px-6 py-5 lg:border-l lg:border-t-0" aria-label={t("qb.editor.preview", "Xem trước")}>
            <div className="sticky top-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("qb.editor.preview", "Xem trước")}</h3>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={revealAnswer} onChange={(e) => setRevealAnswer(e.target.checked)} className="accent-emerald-600" />
                  {t("qb.editor.showAnswer", "Hiện đáp án đúng")}
                </label>
              </div>
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                {form.content.trim() ? (
                  <LatexContent text={form.content} className="text-[15px] font-medium" />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("qb.editor.previewEmpty", "Nội dung câu hỏi sẽ hiện ở đây.")}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{multiple ? t("qb.editor.pickMany", "Chọn tất cả đáp án đúng") : t("qb.editor.pickOne", "Chọn một đáp án")}</p>
                <ul className="mt-3 space-y-2">
                  {previewOptions.map(({ text, i }) => {
                    const correct = revealAnswer && form.correct.includes(i);
                    return (
                      <li key={i} className={cn("flex items-start gap-3 rounded-xl border px-3 py-2 text-sm", correct ? "border-emerald-300 bg-success-soft/60 dark:border-emerald-700" : "bg-background")}>
                        <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] font-semibold", multiple ? "rounded-[5px]" : "rounded-full", correct ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground")}>
                          {OPTION_LABELS[i]}
                        </span>
                        {text.trim() ? <LatexContent text={text} className="min-w-0 flex-1" /> : <span className="text-muted-foreground">…</span>}
                      </li>
                    );
                  })}
                </ul>
                {revealAnswer && form.explanation.trim() && (
                  <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">{t("qb.question.solution", "Lời giải")}</p>
                    <LatexContent text={form.explanation} />
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t px-6 py-3 sm:justify-between">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {form.correct.length > 0
              ? t("qb.editor.correctCount", "{{count}} đáp án đúng", { count: form.correct.length })
              : t("qb.editor.noneChosen", "Chưa chọn đáp án đúng")}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("qb.cancel", "Hủy")}</Button>
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? t("qb.saving", "Đang lưu...") : item ? t("qb.save", "Lưu thay đổi") : t("qb.editor.create", "Thêm câu hỏi")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
