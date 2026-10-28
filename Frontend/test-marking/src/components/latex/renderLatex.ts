import katex from "katex";

/**
 * Text with LaTeX -> safe HTML. Everything outside of math is HTML-escaped (so nothing typed by a teacher can inject
 * markup); math is rendered by KaTeX with `trust: false`. Supported delimiters:
 *   $...$  \(...\)  -> inline        $$...$$  \[...\]  -> display
 * `\$` is a literal dollar sign. A lone `$` that never closes stays plain text ("giá 5$").
 * Line breaks become <br>.
 */

type Part = { kind: "text"; value: string } | { kind: "math"; value: string; display: boolean };

const DELIMITERS: Array<{ open: string; close: string; display: boolean }> = [
  { open: "$$", close: "$$", display: true },
  { open: "\\[", close: "\\]", display: true },
  { open: "\\(", close: "\\)", display: false },
  { open: "$", close: "$", display: false },
];

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Index of the closing delimiter at or after `from`, skipping backslash-escaped characters; -1 when it never closes. */
function findClose(src: string, close: string, from: number): number {
  for (let i = from; i < src.length; i++) {
    if (src[i] === "\\" && close !== "\\]" && close !== "\\)") { i++; continue; }   // "\$" does not close
    if (src.startsWith(close, i)) return i;
  }
  return -1;
}

export function splitLatex(src: string): Part[] {
  const parts: Part[] = [];
  let text = "";
  const flush = () => { if (text) { parts.push({ kind: "text", value: text }); text = ""; } };
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("\\$", i)) { text += "$"; i += 2; continue; }
    const d = DELIMITERS.find((x) => src.startsWith(x.open, i));
    if (d) {
      const start = i + d.open.length;
      const end = findClose(src, d.close, start);
      const body = end < 0 ? "" : src.slice(start, end);
      // "$ $" or "$$" with nothing inside is not math; an inline $...$ may not start/end with a space ("5$ and 6$")
      const valid = end >= 0 && body.trim() !== "" && (d.display || d.open !== "$" || (!/^\s/.test(body) && !/\s$/.test(body)));
      if (valid) {
        flush();
        parts.push({ kind: "math", value: body, display: d.display });
        i = end + d.close.length;
        continue;
      }
    }
    text += src[i];
    i++;
  }
  flush();
  return parts;
}

export function renderLatexHtml(src: string | null | undefined): string {
  if (!src) return "";
  return splitLatex(src)
    .map((p) => {
      if (p.kind === "text") return escapeHtml(p.value).replace(/\r?\n/g, "<br>");
      try {
        return katex.renderToString(p.value, { displayMode: p.display, throwOnError: false, trust: false, strict: "ignore", output: "html" });
      } catch {
        return `<span class="text-destructive">${escapeHtml(p.value)}</span>`;
      }
    })
    .join("");
}

/** True when the caret at `pos` is inside an unfinished $...$ / $$...$$ (used to decide whether a snippet needs its own $). */
export function isInsideMath(text: string, pos: number): boolean {
  const before = text.slice(0, pos).replace(/\\\$/g, "");
  const parts = before.split("$$");
  if (parts.length % 2 === 0) return true;             // inside $$ ... 
  const singles = parts.join("").split("$").length - 1;
  return singles % 2 === 1;
}
