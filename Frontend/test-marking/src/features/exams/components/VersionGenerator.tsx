import { AlertTriangle, Dices } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkVersionPlan, MAX_VERSIONS, type ExamVersion, type GenerateVersionsPayload, type VersionPlanIssue } from "../examsSpring.api";

type Counts = { easy: number; medium: number; hard: number };

function toInt(v: string): number {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Step 3: how many versions (mã đề) and how many easy / medium / hard questions in each; the server draws them at random. */
export function VersionGenerator({ bank, templateTotal, versions, initial, busy, onGenerate }: {
  bank: Counts | null;
  /** answer rows on the chosen sheet, null when the exam has no sheet (online) */
  templateTotal: number | null;
  versions: ExamVersion[];
  initial?: Partial<GenerateVersionsPayload>;
  busy: boolean;
  onGenerate: (plan: GenerateVersionsPayload) => void;
}) {
  const { t } = useTranslation();
  const [count, setCount] = useState(String(initial?.count || 2));
  const [easy, setEasy] = useState(String(initial?.easy ?? 0));
  const [medium, setMedium] = useState(String(initial?.medium ?? 0));
  const [hard, setHard] = useState(String(initial?.hard ?? 0));

  const plan: GenerateVersionsPayload = { count: toInt(count), easy: toInt(easy), medium: toInt(medium), hard: toInt(hard) };
  const total = Math.max(0, plan.easy) + Math.max(0, plan.medium) + Math.max(0, plan.hard);
  const issues = checkVersionPlan(plan, bank, templateTotal);

  const text: Record<VersionPlanIssue, string> = {
    COUNT: t("exam.gen.err.count", "Số mã đề phải từ 1 đến {{max}}.", { max: MAX_VERSIONS }),
    EMPTY: t("exam.gen.err.empty", "Mỗi mã đề cần ít nhất 1 câu hỏi."),
    NEGATIVE: t("exam.gen.err.negative", "Số câu không được âm."),
    EXCEED_TEMPLATE: t("exam.gen.err.exceed", "Mỗi mã đề có {{n}} câu, nhiều hơn mẫu phiếu ({{max}} câu). Hãy giảm số câu hoặc chọn mẫu phiếu lớn hơn.", { n: total, max: templateTotal ?? 0 }),
    NOT_ENOUGH_EASY: t("exam.gen.err.easy", "Ngân hàng chỉ có {{n}} câu dễ.", { n: bank?.easy ?? 0 }),
    NOT_ENOUGH_MEDIUM: t("exam.gen.err.medium", "Ngân hàng chỉ có {{n}} câu trung bình.", { n: bank?.medium ?? 0 }),
    NOT_ENOUGH_HARD: t("exam.gen.err.hard", "Ngân hàng chỉ có {{n}} câu khó.", { n: bank?.hard ?? 0 }),
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, max?: number, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={0} max={max} value={value} onChange={(e) => set(e.target.value)} className="tabular-nums" />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5" aria-labelledby="gen-title">
      <div>
        <h3 id="gen-title" className="flex items-center gap-2 text-lg font-semibold"><Dices className="h-5 w-5 text-primary" />{t("exam.gen.title", "Tạo mã đề ngẫu nhiên")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("exam.gen.hint", "Mỗi mã đề lấy ngẫu nhiên số câu dễ, trung bình, khó bạn chọn, rồi xáo trộn thứ tự. Mã đề là số 3 chữ số.")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {field("gen-count", t("exam.gen.count", "Số mã đề"), count, setCount, MAX_VERSIONS)}
        {field("gen-easy", t("exam.gen.easy", "Câu dễ"), easy, setEasy, undefined, bank ? t("exam.gen.has", "Có {{n}}", { n: bank.easy }) : undefined)}
        {field("gen-medium", t("exam.gen.medium", "Câu trung bình"), medium, setMedium, undefined, bank ? t("exam.gen.has", "Có {{n}}", { n: bank.medium }) : undefined)}
        {field("gen-hard", t("exam.gen.hard", "Câu khó"), hard, setHard, undefined, bank ? t("exam.gen.has", "Có {{n}}", { n: bank.hard }) : undefined)}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-muted/60 px-4 py-3 text-sm">
        <span>{t("exam.gen.perVersion", "Mỗi mã đề")}: <strong className="tabular-nums">{total}</strong> {t("exam.questionsShort", "câu")}</span>
        {templateTotal != null && (
          <span className="text-muted-foreground">
            {t("exam.gen.sheet", "Mẫu phiếu có {{n}} câu", { n: templateTotal })}
            {total > 0 && total < templateTotal && ` · ${t("exam.gen.spare", "{{n}} dòng cuối để trống", { n: templateTotal - total })}`}
          </span>
        )}
      </div>

      {issues.length > 0 && (
        <ul role="alert" className="space-y-1.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {issues.map((i) => <li key={i} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{text[i]}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy || issues.length > 0 || !bank} onClick={() => onGenerate(plan)} className="gap-2">
          <Dices className="h-4 w-4" />
          {versions.length > 0 ? t("exam.gen.regenerate", "Tạo lại mã đề") : t("exam.gen.generate", "Tạo mã đề")}
        </Button>
        {versions.length > 0 && <span className="text-xs text-muted-foreground">{t("exam.gen.replaceNote", "Tạo lại sẽ thay thế toàn bộ mã đề hiện có.")}</span>}
      </div>

      {versions.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">{t("exam.gen.created", "Các mã đề đã tạo")} ({versions.length})</h4>
          <ul className="flex flex-wrap gap-2" data-testid="version-chips">
            {versions.map((v) => (
              <li key={v.id} className="rounded-xl border bg-background px-3 py-2 text-sm">
                <span className="font-semibold tabular-nums">{v.code}</span>
                <span className="ml-2 text-xs text-muted-foreground">{v.question_count} {t("exam.questionsShort", "câu")} · {v.easy}/{v.medium}/{v.hard}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
