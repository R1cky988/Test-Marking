import { Check, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { LatexContent } from "@/components/latex/LatexContent";
import type { QuestionBankItem } from "../questionBanks.api";
import { DifficultyBadge, TypeBadge } from "./questionMeta";

export function QuestionCard({ item, number, onEdit, onDelete }: {
  item: QuestionBankItem;
  number: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [showSolution, setShowSolution] = useState(false);
  const multiple = item.question_type === "MULTIPLE";

  return (
    <article className="group rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md" data-testid="question-card">
      <header className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-muted-foreground">{number}</span>
        <TypeBadge type={item.question_type} />
        <DifficultyBadge difficulty={item.difficulty} />
        <div className="ml-auto flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={t("qb.question.edit", "Sửa câu hỏi")}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} aria-label={t("qb.question.delete", "Xóa câu hỏi")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <LatexContent text={item.content} className="mt-3 text-[15px] font-medium text-foreground" />

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {item.options.map((o) => (
          <li
            key={o.label}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm",
              o.is_correct ? "border-emerald-300 bg-success-soft/60 dark:border-emerald-700" : "bg-background",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold",
                multiple ? "rounded-md" : "rounded-full",
                o.is_correct ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {o.is_correct ? <Check className="h-3.5 w-3.5" /> : o.label}
            </span>
            <LatexContent text={o.content} className="min-w-0 flex-1" />
            {o.is_correct && <span className="sr-only">{t("qb.question.correct", "Đáp án đúng")}</span>}
          </li>
        ))}
      </ul>

      {item.explanation && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowSolution((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" aria-expanded={showSolution}>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSolution && "rotate-180")} />
            {t("qb.question.solution", "Lời giải")}
          </button>
          {showSolution && <LatexContent text={item.explanation} className="mt-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm" />}
        </div>
      )}
    </article>
  );
}
