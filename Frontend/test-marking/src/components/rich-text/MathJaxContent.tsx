import { useEffect, useRef } from "react";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import { sanitizeRichTextHtml } from "./sanitizeRichTextHtml";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      tex?: unknown;
      svg?: unknown;
    };
  }
}

let mathJaxLoading: Promise<void> | null = null;

function ensureMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve();
  if (mathJaxLoading) return mathJaxLoading;

  window.MathJax = {
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    },
    svg: { fontCache: "global" },
  };

  mathJaxLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cannot load MathJax"));
    document.head.appendChild(script);
  });

  return mathJaxLoading;
}

function resolveRichTextImageUrls(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("img[src]").forEach((image) => {
    const src = image.getAttribute("src");
    if (src) image.setAttribute("src", resolveServerImageUrl(src));
  });

  return template.innerHTML;
}

export function MathJaxContent({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const sanitized = resolveRichTextImageUrls(sanitizeRichTextHtml(html));
  const resolvedClassName = ["mathjax-content", className].filter(Boolean).join(" ");

  useEffect(() => {
    void ensureMathJax()
      .then(() => {
        if (ref.current) return window.MathJax?.typesetPromise?.([ref.current]);
      })
      .catch(() => undefined);
  }, [sanitized]);

  return <div ref={ref} className={resolvedClassName} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
