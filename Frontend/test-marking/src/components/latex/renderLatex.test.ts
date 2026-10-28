import { describe, expect, it } from "vitest";
import { escapeHtml, isInsideMath, renderLatexHtml, splitLatex } from "./renderLatex";
import { expandSnippet } from "./latexSnippets";

describe("renderLatexHtml", () => {
  it("renders inline math with KaTeX and keeps the text around it", () => {
    const html = renderLatexHtml("Tính $x^2$ nhé");
    expect(html).toContain('class="katex"');
    expect(html.startsWith("Tính ")).toBe(true);
    expect(html.endsWith(" nhé")).toBe(true);
  });

  it("renders $$ and \\[ \\] as display math, \\( \\) as inline", () => {
    expect(renderLatexHtml("$$\\frac{a}{b}$$")).toContain("katex-display");
    expect(renderLatexHtml("\\[x\\]")).toContain("katex-display");
    const inline = renderLatexHtml("\\(x\\)");
    expect(inline).toContain('class="katex"');
    expect(inline).not.toContain("katex-display");
  });

  it("escapes HTML outside of math: nothing typed can become markup", () => {
    const html = renderLatexHtml('<img src=x onerror="alert(1)"> & <script>alert(2)</script>');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;");
  });

  it("does not let math smuggle HTML either (trust: false, throwOnError: false)", () => {
    const html = renderLatexHtml("$\\href{javascript:alert(1)}{x}$ $\\htmlClass{a}{b}$ $\\includegraphics{x.png}$");
    expect(html).not.toContain("javascript:alert");
    expect(html).not.toMatch(/<a [^>]*href/);
  });

  it("turns line breaks into <br>", () => {
    expect(renderLatexHtml("a\nb")).toBe("a<br>b");
  });

  it("treats \\$ as a dollar sign and a lone $ as text", () => {
    expect(renderLatexHtml("giá 5\\$ và 6\\$")).toBe("giá 5$ và 6$");
    expect(renderLatexHtml("giá 5$ thôi")).toBe("giá 5$ thôi");
    expect(renderLatexHtml("5$ và 6$")).toBe("5$ và 6$");   // inline math may not start / end with a space
  });

  it("shows broken LaTeX as a red error instead of throwing", () => {
    expect(() => renderLatexHtml("$\\frac{1$")).not.toThrow();
    expect(renderLatexHtml("$\\frac{1$")).toContain("katex-error");
  });

  it("returns '' for empty input", () => {
    expect(renderLatexHtml("")).toBe("");
    expect(renderLatexHtml(null)).toBe("");
    expect(renderLatexHtml("$$ $$")).toBe("$$ $$");
  });
});

describe("splitLatex / isInsideMath / snippets", () => {
  it("splits text and math parts", () => {
    expect(splitLatex("a $b$ c")).toEqual([
      { kind: "text", value: "a " }, { kind: "math", value: "b", display: false }, { kind: "text", value: " c" },
    ]);
  });
  it("knows whether the caret is inside math", () => {
    expect(isInsideMath("a $b", 4)).toBe(true);
    expect(isInsideMath("a $b$ c", 7)).toBe(false);
    expect(isInsideMath("$$ab", 4)).toBe(true);
    expect(isInsideMath("giá 5\\$ ", 8)).toBe(false);
  });
  it("expands a snippet and finds the caret", () => {
    expect(expandSnippet("\\frac{▮}{}")).toEqual({ text: "\\frac{}{}", caret: 6 });
    expect(expandSnippet("\\pm ")).toEqual({ text: "\\pm ", caret: 4 });
  });
  it("escapeHtml", () => { expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;"); });
});
