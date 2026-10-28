/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { MathJaxContent } from "./MathJaxContent";
import { sanitizeRichTextHtml } from "./sanitizeRichTextHtml";

describe("sanitizeRichTextHtml", () => {
  it("removes scripts and inline event handlers while preserving math markup", () => {
    const sanitized = sanitizeRichTextHtml(`
      <p onclick="alert(1)">Solve $x^2$</p>
      <img src="x" onerror="alert(2)">
      <a href="javascript:alert(3)">bad link</a>
      <script>alert(4)</script>
    `);

    expect(sanitized).toContain("Solve $x^2$");
    expect(sanitized).toContain("<img src=\"x\">");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
  });

  it("keeps MathJax-generated tags allowed by the renderer", () => {
    const sanitized = sanitizeRichTextHtml('<mjx-container jax="SVG" display="true"><mjx-math><mjx-mi>x</mjx-mi></mjx-math></mjx-container>');

    expect(sanitized).toContain("mjx-container");
    expect(sanitized).toContain('jax="SVG"');
    expect(sanitized).toContain("mjx-mi");
  });
});

describe("MathJaxContent", () => {
  it("renders sanitized TeX content and asks MathJax to typeset it", async () => {
    const typesetPromise = vi.fn().mockResolvedValue(undefined);
    window.MathJax = { typesetPromise };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MathJaxContent html={'<span onmouseover="alert(1)">Area $a^2$</span><script>alert(2)</script>'} />);
    });

    expect(container.innerHTML).toContain("Area $a^2$");
    expect(container.innerHTML).not.toContain("onmouseover");
    expect(container.innerHTML).not.toContain("<script");
    expect(typesetPromise).toHaveBeenCalledWith([container.firstElementChild]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("resolves uploaded rich-text image URLs against the backend origin", async () => {
    window.MathJax = { typesetPromise: vi.fn().mockResolvedValue(undefined) };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MathJaxContent
          html={[
            '<img src="/api/v1/uploads/questions/image.jpg">',
            '<img src="/uploads/questions/choice.jpg">',
            '<img src="uploads/questions/relative.jpg">',
            '<img src="http://localhost:3001/uploads/questions/local.jpg">',
          ].join("")}
        />,
      );
    });

    const sources = [...container.querySelectorAll("img")].map((image) => image.getAttribute("src"));
    expect(sources).toEqual([
      "http://localhost:3001/api/v1/uploads/questions/image.jpg",
      "http://localhost:3001/api/v1/uploads/questions/choice.jpg",
      "http://localhost:3001/api/v1/uploads/questions/relative.jpg",
      "http://localhost:3001/api/v1/uploads/questions/local.jpg",
    ]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
