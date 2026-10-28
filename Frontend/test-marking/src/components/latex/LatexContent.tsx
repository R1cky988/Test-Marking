import { memo, useMemo } from "react";
import "katex/dist/katex.min.css";

import { cn } from "@/components/ui/utils";
import { renderLatexHtml } from "./renderLatex";

/** Text with LaTeX ($x^2$, $$\frac{a}{b}$$) as read-only content. The HTML comes from renderLatexHtml (escaped + KaTeX). */
export const LatexContent = memo(function LatexContent({ text, className }: { text: string | null | undefined; className?: string }) {
  const html = useMemo(() => renderLatexHtml(text), [text]);
  return <div className={cn("latex-content break-words leading-relaxed [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden", className)} dangerouslySetInnerHTML={{ __html: html }} />;
});
