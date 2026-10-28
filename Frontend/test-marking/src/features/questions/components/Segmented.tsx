import type { ReactNode } from "react";

import { cn } from "@/components/ui/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Extra classes of the option while it is selected (e.g. a difficulty colour). */
  activeClassName?: string;
}

/** Pill-shaped single choice (radiogroup). */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = "md" }: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-muted p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
              active ? cn("bg-card text-foreground shadow-sm", o.activeClassName) : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
