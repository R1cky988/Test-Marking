import { describe, expect, it } from "vitest";
import { addOption, emptyForm, filledOptions, formFromItem, removeOption, setOption, setType, toggleCorrect, toInput, validate } from "../questionForm";
import type { QuestionBankItem } from "../questionBanks.api";

function filled() {
  let f = emptyForm();
  f = { ...f, content: "Tính $2+2$" };
  ["1", "2", "3", "4"].forEach((v, i) => { f = setOption(f, i, v); });
  return f;
}

describe("question form", () => {
  it("starts as a single-answer question with 4 empty options and nothing chosen", () => {
    const f = emptyForm();
    expect(f.type).toBe("SINGLE");
    expect(f.options).toHaveLength(4);
    expect(f.correct).toEqual([]);
    expect(validate(f)).toEqual(expect.arrayContaining(["content", "options_min", "correct_none"]));
  });

  it("single: choosing an option replaces the previous choice", () => {
    let f = toggleCorrect(filled(), 1);
    f = toggleCorrect(f, 3);
    expect(f.correct).toEqual([3]);
  });

  it("multiple: options are switched on and off, kept sorted", () => {
    let f = setType(filled(), "MULTIPLE");
    f = toggleCorrect(toggleCorrect(toggleCorrect(f, 2), 0), 3);
    expect(f.correct).toEqual([0, 2, 3]);
    expect(toggleCorrect(f, 2).correct).toEqual([0, 3]);
  });

  it("multiple -> single keeps only the first right option; single -> multiple keeps the choice", () => {
    let f = setType(filled(), "MULTIPLE");
    f = toggleCorrect(toggleCorrect(f, 3), 1);
    expect(setType(f, "SINGLE").correct).toEqual([1]);
    expect(setType(setType(toggleCorrect(filled(), 2), "MULTIPLE"), "MULTIPLE").correct).toEqual([2]);
  });

  it("removing an option shifts the right answers after it; at least 2 options stay; at most 5", () => {
    let f = setType(filled(), "MULTIPLE");
    f = toggleCorrect(toggleCorrect(f, 1), 3);
    f = removeOption(f, 0);
    expect(f.options).toEqual(["2", "3", "4"]);
    expect(f.correct).toEqual([0, 2]);
    f = removeOption(f, 0);
    expect(f.correct).toEqual([1]);
    expect(removeOption(f, 0).options).toHaveLength(2);
    expect(removeOption(removeOption(f, 0), 0).options).toHaveLength(2);
    let g = filled(); g = addOption(addOption(g)); expect(g.options).toHaveLength(5);
    expect(addOption(g).options).toHaveLength(5);
  });

  it("removing the right option leaves nothing chosen", () => {
    expect(removeOption(toggleCorrect(filled(), 2), 2).correct).toEqual([]);
  });

  it("trailing empty boxes are not options; an empty box in the middle is an error", () => {
    let f = toggleCorrect({ ...filled(), options: ["a", "b", "", ""] }, 1);
    expect(filledOptions(f)).toEqual(["a", "b"]);
    expect(validate(f)).toEqual([]);
    expect(toInput(f).options).toEqual(["a", "b"]);
    f = { ...f, options: ["a", "", "c", ""] };
    expect(validate(f)).toContain("option_empty");
  });

  it("a right answer that points at an empty trailing box does not count", () => {
    const f = { ...filled(), options: ["a", "b", "", ""], correct: [3] };
    expect(validate(f)).toContain("correct_none");
  });

  it("builds the request: labels, trimmed text, optional fields left out", () => {
    let f = setType({ ...filled(), content: "  Câu  ", explanation: "  " }, "MULTIPLE");
    f = toggleCorrect(toggleCorrect(f, 3), 0);
    expect(toInput(f)).toEqual({
      content: "Câu", explanation: undefined, options: ["1", "2", "3", "4"], question_type: "MULTIPLE",
      correct_answers: ["A", "D"], difficulty: "MEDIUM",
    });
  });

  it("single with more than one right answer is an error", () => {
    expect(validate({ ...filled(), correct: [0, 1] })).toContain("correct_single");
  });

  it("loads a saved question back into the form", () => {
    const item: QuestionBankItem = {
      id: "q1", bank_id: "b", content: "c", explanation: "e", question_type: "MULTIPLE",
      options: [{ label: "A", content: "x", is_correct: false }, { label: "B", content: "y", is_correct: true }, { label: "C", content: "z", is_correct: true }],
      correct_answers: ["B", "C"], difficulty: "HARD", created_at: null, updated_at: null,
    };
    expect(formFromItem(item)).toEqual({ type: "MULTIPLE", content: "c", explanation: "e", options: ["x", "y", "z"], correct: [1, 2], difficulty: "HARD" });
  });
});
