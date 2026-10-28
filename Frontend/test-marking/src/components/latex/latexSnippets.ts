/** Symbol palette of the LaTeX editor. `▮` marks where the caret goes (the first one; the rest are tab-stops by hand). */
export interface LatexSnippet {
  label: string;     // what the button shows (plain text / unicode)
  latex: string;     // what is inserted
  title: string;
}

export interface LatexGroup {
  id: string;
  title: string;
  items: LatexSnippet[];
}

export const LATEX_GROUPS: LatexGroup[] = [
  {
    id: "basic", title: "Cơ bản",
    items: [
      { label: "a/b", latex: "\\frac{▮}{}", title: "Phân số" },
      { label: "√", latex: "\\sqrt{▮}", title: "Căn bậc hai" },
      { label: "ⁿ√", latex: "\\sqrt[▮]{}", title: "Căn bậc n" },
      { label: "xⁿ", latex: "^{▮}", title: "Số mũ" },
      { label: "xₙ", latex: "_{▮}", title: "Chỉ số dưới" },
      { label: "|x|", latex: "\\left|▮\\right|", title: "Giá trị tuyệt đối" },
      { label: "( )", latex: "\\left(▮\\right)", title: "Ngoặc tự co giãn" },
      { label: "{ }", latex: "\\begin{cases} ▮ \\\\ \\end{cases}", title: "Hệ / hàm nhiều nhánh" },
      { label: "x̄", latex: "\\overline{▮}", title: "Gạch ngang trên" },
      { label: "→", latex: "\\vec{▮}", title: "Vectơ" },
    ],
  },
  {
    id: "operators", title: "Phép toán",
    items: [
      { label: "±", latex: "\\pm ", title: "Cộng trừ" },
      { label: "×", latex: "\\times ", title: "Nhân" },
      { label: "÷", latex: "\\div ", title: "Chia" },
      { label: "·", latex: "\\cdot ", title: "Chấm nhân" },
      { label: "≤", latex: "\\leq ", title: "Nhỏ hơn hoặc bằng" },
      { label: "≥", latex: "\\geq ", title: "Lớn hơn hoặc bằng" },
      { label: "≠", latex: "\\neq ", title: "Khác" },
      { label: "≈", latex: "\\approx ", title: "Xấp xỉ" },
      { label: "∞", latex: "\\infty ", title: "Vô cực" },
      { label: "°", latex: "^{\\circ}", title: "Độ" },
    ],
  },
  {
    id: "calculus", title: "Giải tích",
    items: [
      { label: "∑", latex: "\\sum_{▮}^{}", title: "Tổng" },
      { label: "∏", latex: "\\prod_{▮}^{}", title: "Tích" },
      { label: "∫", latex: "\\int_{▮}^{} \\,dx", title: "Tích phân" },
      { label: "lim", latex: "\\lim_{x \\to ▮}", title: "Giới hạn" },
      { label: "d/dx", latex: "\\frac{d}{dx}", title: "Đạo hàm" },
      { label: "∂", latex: "\\partial ", title: "Đạo hàm riêng" },
      { label: "log", latex: "\\log_{▮}", title: "Logarit" },
      { label: "sin", latex: "\\sin ", title: "sin" },
      { label: "cos", latex: "\\cos ", title: "cos" },
      { label: "tan", latex: "\\tan ", title: "tan" },
    ],
  },
  {
    id: "sets", title: "Tập hợp & logic",
    items: [
      { label: "∈", latex: "\\in ", title: "Thuộc" },
      { label: "∉", latex: "\\notin ", title: "Không thuộc" },
      { label: "⊂", latex: "\\subset ", title: "Tập con" },
      { label: "∪", latex: "\\cup ", title: "Hợp" },
      { label: "∩", latex: "\\cap ", title: "Giao" },
      { label: "∅", latex: "\\emptyset ", title: "Tập rỗng" },
      { label: "ℝ", latex: "\\mathbb{R}", title: "Số thực" },
      { label: "ℕ", latex: "\\mathbb{N}", title: "Số tự nhiên" },
      { label: "∀", latex: "\\forall ", title: "Với mọi" },
      { label: "∃", latex: "\\exists ", title: "Tồn tại" },
      { label: "⇒", latex: "\\Rightarrow ", title: "Suy ra" },
      { label: "⇔", latex: "\\Leftrightarrow ", title: "Tương đương" },
    ],
  },
  {
    id: "greek", title: "Chữ Hy Lạp",
    items: [
      ["α", "alpha"], ["β", "beta"], ["γ", "gamma"], ["δ", "delta"], ["ε", "varepsilon"], ["θ", "theta"],
      ["λ", "lambda"], ["μ", "mu"], ["π", "pi"], ["ρ", "rho"], ["σ", "sigma"], ["φ", "varphi"], ["ω", "omega"],
      ["Δ", "Delta"], ["Σ", "Sigma"], ["Ω", "Omega"],
    ].map(([label, name]) => ({ label, latex: `\\${name} `, title: name })),
  },
  {
    id: "matrix", title: "Ma trận",
    items: [
      { label: "[ ]", latex: "\\begin{bmatrix} ▮ & \\\\ & \\end{bmatrix}", title: "Ma trận 2×2" },
      { label: "( )", latex: "\\begin{pmatrix} ▮ & \\\\ & \\end{pmatrix}", title: "Ma trận ngoặc tròn" },
      { label: "| |", latex: "\\begin{vmatrix} ▮ & \\\\ & \\end{vmatrix}", title: "Định thức" },
    ],
  },
];

/** The caret marker is removed from the inserted text; its position is returned. */
export function expandSnippet(latex: string): { text: string; caret: number } {
  const at = latex.indexOf("▮");
  if (at < 0) return { text: latex, caret: latex.length };
  return { text: latex.replace(/▮/g, ""), caret: at };
}
