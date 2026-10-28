import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Sigma } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/components/ui/utils";
import { LatexContent } from "./LatexContent";
import { expandSnippet, LATEX_GROUPS } from "./latexSnippets";
import { isInsideMath } from "./renderLatex";

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Rows of the box at rest; it grows with the text up to maxRows. */
  minRows?: number;
  maxRows?: number;
  /** Show the rendered text under the box while there is something to show. */
  preview?: boolean;
  /** Smaller paddings (answer boxes). */
  compact?: boolean;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Plain text box for questions and answers written with LaTeX ($x^2$ or $$\frac{a}{b}$$), with a symbol palette that
 * puts the snippet at the caret (wrapped in $...$ when the caret is not already inside math) and a live rendered preview.
 */
export function LatexEditor({ value, onChange, placeholder, minRows = 3, maxRows = 14, preview = true, compact = false, invalid, id, className, ...rest }: LatexEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(LATEX_GROUPS[0].id);

  // grow with the content
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const pad = (parseFloat(getComputedStyle(el).paddingTop) || 0) + (parseFloat(getComputedStyle(el).paddingBottom) || 0);
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + pad)}px`;
  }, [value, maxRows]);

  const insert = useCallback((latex: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const inside = isInsideMath(value, start);
    let { text, caret } = expandSnippet(latex);
    if (selected && latex.includes("▮")) {
      // wrap the selection: \sqrt{▮} + "x" -> \sqrt{x}
      const at = latex.indexOf("▮");
      text = latex.slice(0, at).replace(/▮/g, "") + selected + latex.slice(at + 1).replace(/▮/g, "");
      caret = at + selected.length;
    }
    let before = text.slice(0, caret), after = text.slice(caret);
    if (!inside) { before = "$" + before; after = after + "$"; }
    const next = value.slice(0, start) + before + after + value.slice(end);
    const pos = start + before.length;
    onChange(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos); });
  }, [onChange, value]);

  const current = LATEX_GROUPS.find((g) => g.id === group) ?? LATEX_GROUPS[0];

  const palette = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Chèn công thức" title="Chèn công thức">
            <Sigma className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Sigma className="h-3.5 w-3.5" /> Công thức
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <div className="flex gap-1 overflow-x-auto border-b p-1.5">
          {LATEX_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={cn("shrink-0 rounded-md px-2 py-1 text-xs font-medium", g.id === group ? "bg-brand-soft text-brand-soft-foreground" : "text-muted-foreground hover:bg-muted")}
            >
              {g.title}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1 p-2">
          {current.items.map((sn) => (
            <button
              key={sn.title + sn.latex}
              type="button"
              title={`${sn.title}  ${sn.latex.replace(/▮/g, "")}`}
              onClick={() => { insert(sn.latex); setOpen(false); }}
              className="flex h-9 items-center justify-center rounded-md border bg-background text-sm hover:border-primary hover:bg-brand-soft"
            >
              {sn.label}
            </button>
          ))}
        </div>
        <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
          Gõ <code className="rounded bg-muted px-1">$x^2$</code> trong dòng, <code className="rounded bg-muted px-1">$$…$$</code> để căn giữa.
        </p>
      </PopoverContent>
    </Popover>
  );

  const box = (
    <div className={cn(
      "rounded-xl border bg-card transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
      invalid && "border-destructive focus-within:ring-destructive/30",
      compact && "flex items-start",
    )}>
      <textarea
        ref={ref}
        id={id}
        aria-label={rest["aria-label"]}
        value={value}
        rows={minRows}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className={cn("block w-full resize-none bg-transparent font-mono text-[13px] leading-6 outline-none placeholder:font-sans placeholder:text-muted-foreground", compact ? "min-w-0 flex-1 px-3 py-2" : "px-3.5 pt-3 pb-1.5")}
      />
      {compact ? (
        <div className="p-0.5">{palette}</div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
          {palette}
          <span className="pr-1 text-[11px] text-muted-foreground">LaTeX</span>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {box}
      {preview && value.trim() && (
        <div className="rounded-lg bg-muted/50 px-3.5 py-2.5 text-sm" aria-label="Xem trước">
          <LatexContent text={value} />
        </div>
      )}
    </div>
  );
}
