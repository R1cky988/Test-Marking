import { CheckSquare, CircleDot } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/components/ui/utils";
import type { QuestionDifficulty, QuestionType } from "../questionBanks.api";

export const DIFFICULTY_TONE: Record<QuestionDifficulty, { chip: string; dot: string; bar: string }> = {
  EASY: { chip: "bg-success-soft text-success-foreground", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  MEDIUM: { chip: "bg-warning-soft text-warning-foreground", dot: "bg-amber-500", bar: "bg-amber-500" },
  HARD: { chip: "bg-danger-soft text-danger-foreground", dot: "bg-rose-500", bar: "bg-rose-500" },
};

export function useDifficultyLabel() {
  const { t } = useTranslation();
  return (d: QuestionDifficulty) =>
    d === "EASY" ? t("qb.difficulty.easy", "Dễ") : d === "MEDIUM" ? t("qb.difficulty.medium", "Trung bình") : t("qb.difficulty.hard", "Khó");
}

export function DifficultyBadge({ difficulty }: { difficulty: QuestionDifficulty }) {
  const label = useDifficultyLabel();
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", DIFFICULTY_TONE[difficulty].chip)}>{label(difficulty)}</span>;
}

export function TypeBadge({ type }: { type: QuestionType }) {
  const { t } = useTranslation();
  const multiple = type === "MULTIPLE";
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-soft-foreground">
      {multiple ? <CheckSquare className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
      {multiple ? t("qb.type.multiple", "Nhiều đáp án") : t("qb.type.single", "Một đáp án")}
    </span>
  );
}
