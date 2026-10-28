import { cn } from "@/components/ui/utils";
import { DIFFICULTY_TONE, useDifficultyLabel } from "./questionMeta";

/** Stacked bar of easy / medium / hard with a legend. */
export function DifficultyBar({ easy, medium, hard, legend = true }: { easy: number; medium: number; hard: number; legend?: boolean }) {
  const label = useDifficultyLabel();
  const total = easy + medium + hard;
  const rows = [["EASY", easy], ["MEDIUM", medium], ["HARD", hard]] as const;
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={rows.map(([d, n]) => `${label(d)}: ${n}`).join(", ")}>
        {total > 0 && rows.map(([d, n]) => n > 0 && <span key={d} className={cn("h-full", DIFFICULTY_TONE[d].bar)} style={{ width: `${(n / total) * 100}%` }} />)}
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {rows.map(([d, n]) => (
            <span key={d} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", DIFFICULTY_TONE[d].dot)} />
              {label(d)} <b className="font-semibold tabular-nums text-foreground">{n}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
