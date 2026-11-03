// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

vi.mock("@/api/axiosClient", () => ({ default: {} }));

import { QuestionEditorDialog } from "../components/QuestionEditorDialog";
import type { QuestionBankItem } from "../questionBanks.api";

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ lng: "vi", resources: { vi: { translation: {} } }, interpolation: { escapeValue: false } });
});
beforeEach(() => cleanup());

function mount(item: QuestionBankItem | null = null) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(<QuestionEditorDialog open onOpenChange={onOpenChange} item={item} saving={false} onSave={onSave} />);
  return { onSave, onOpenChange };
}

describe("QuestionEditorDialog", () => {
  it("creates a single-answer question: LaTeX is typed, the right option is picked, the preview renders it", async () => {
    const { onSave } = mount();
    await userEvent.type(document.querySelector<HTMLTextAreaElement>("#qb-content")!, "Tính $x^2$");
    await userEvent.type(screen.getByLabelText("Đáp án A", { selector: "textarea" }), "1");
    await userEvent.type(screen.getByLabelText("Đáp án B", { selector: "textarea" }), "$\\frac{{1}{{2}$");   // user-event: "{{" types a literal "{"
    await userEvent.click(screen.getByRole("radio", { name: "Đáp án B là đáp án đúng" }));

    const preview = screen.getByLabelText("Xem trước");
    expect(preview.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);   // question + option B

    await userEvent.click(screen.getByRole("button", { name: "Thêm câu hỏi", hidden: false }));
    expect(onSave).toHaveBeenCalledWith({
      content: "Tính $x^2$", explanation: undefined, options: ["1", "$\\frac{1}{2}$"], question_type: "SINGLE",
      correct_answers: ["B"], difficulty: "MEDIUM",
    });
  });

  it("single: picking another option moves the choice; multiple: several options can be right", async () => {
    const { onSave } = mount();
    await userEvent.type(document.querySelector<HTMLTextAreaElement>("#qb-content")!, "Q");
    for (const [l, v] of [["A", "a"], ["B", "b"], ["C", "c"]] as const) await userEvent.type(screen.getByLabelText(`Đáp án ${l}`, { selector: "textarea" }), v);
    await userEvent.click(screen.getByRole("radio", { name: "Đáp án A là đáp án đúng" }));
    await userEvent.click(screen.getByRole("radio", { name: "Đáp án C là đáp án đúng" }));
    expect(screen.getByRole("radio", { name: "Đáp án A là đáp án đúng" }).getAttribute("aria-checked")).toBe("false");

    await userEvent.click(screen.getByRole("radio", { name: "Nhiều đáp án" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Đáp án A là đáp án đúng" }));
    expect(screen.getAllByRole("checkbox").filter((c) => c.getAttribute("aria-checked") === "true")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Thêm câu hỏi" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ question_type: "MULTIPLE", correct_answers: ["A", "C"] }));
  });

  it("does not save an incomplete question and says what is missing", async () => {
    const { onSave } = mount();
    await userEvent.click(screen.getByRole("button", { name: "Thêm câu hỏi" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Hãy nhập nội dung câu hỏi.")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Cần ít nhất 2 đáp án");
  });

  it("opens a saved question with its options and right answers, and sends the changes", async () => {
    const item: QuestionBankItem = {
      id: "q1", bank_id: "b", content: "Chọn số chẵn", explanation: "Chia hết cho 2", question_type: "MULTIPLE",
      options: [{ label: "A", content: "1", is_correct: false }, { label: "B", content: "2", is_correct: true }, { label: "C", content: "4", is_correct: true }],
      correct_answers: ["B", "C"], difficulty: "HARD", created_at: null, updated_at: null,
    };
    const { onSave } = mount(item);
    expect((document.querySelector("#qb-content") as HTMLTextAreaElement).value).toBe("Chọn số chẵn");
    expect(screen.getByRole("checkbox", { name: "Đáp án B là đáp án đúng" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("checkbox", { name: "Đáp án C là đáp án đúng" }));   // C no longer right
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).toHaveBeenCalledWith({
      content: "Chọn số chẵn", explanation: "Chia hết cho 2", options: ["1", "2", "4"], question_type: "MULTIPLE",
      correct_answers: ["B"], difficulty: "HARD",
    });
  });

  it("removing an option renumbers the labels", async () => {
    mount();
    await userEvent.click(screen.getByRole("button", { name: "Xóa đáp án A" }));
    const labels = screen.getAllByRole("radio").filter((r) => /là đáp án đúng/.test(r.getAttribute("aria-label") ?? ""));
    expect(labels).toHaveLength(3);
    expect(within(labels[2]).getByText("C")).toBeTruthy();
  });
});
