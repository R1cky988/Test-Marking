import { MAX_OPTIONS, MIN_OPTIONS, OPTION_LABELS, type QuestionBankItem, type QuestionBankItemInput, type QuestionDifficulty, type QuestionType } from "./questionBanks.api";

/** State of the question editor. `correct` = indexes of the right options (0 = A). */
export interface QuestionForm {
  type: QuestionType;
  content: string;
  explanation: string;
  options: string[];
  correct: number[];
  difficulty: QuestionDifficulty;
}

export type QuestionFormError = "content" | "options_min" | "option_empty" | "correct_none" | "correct_single";

export function emptyForm(): QuestionForm {
  return { type: "SINGLE", content: "", explanation: "", options: ["", "", "", ""], correct: [], difficulty: "MEDIUM" };
}

export function formFromItem(item: QuestionBankItem): QuestionForm {
  const labels = item.options.map((o) => o.label);
  return {
    type: item.question_type,
    content: item.content,
    explanation: item.explanation ?? "",
    options: item.options.map((o) => o.content),
    correct: item.correct_answers.map((l) => labels.indexOf(l)).filter((i) => i >= 0).sort((a, b) => a - b),
    difficulty: item.difficulty,
  };
}

/** Switching to "one answer" keeps only the first right option. */
export function setType(form: QuestionForm, type: QuestionType): QuestionForm {
  if (form.type === type) return form;
  return { ...form, type, correct: type === "SINGLE" ? form.correct.slice(0, 1) : form.correct };
}

/** Click on the label of an option: single -> it becomes THE answer; multiple -> it is switched on / off. */
export function toggleCorrect(form: QuestionForm, index: number): QuestionForm {
  if (form.type === "SINGLE") return { ...form, correct: [index] };
  const has = form.correct.includes(index);
  return { ...form, correct: (has ? form.correct.filter((i) => i !== index) : [...form.correct, index]).sort((a, b) => a - b) };
}

export function setOption(form: QuestionForm, index: number, value: string): QuestionForm {
  return { ...form, options: form.options.map((o, i) => (i === index ? value : o)) };
}

export function addOption(form: QuestionForm): QuestionForm {
  return form.options.length >= MAX_OPTIONS ? form : { ...form, options: [...form.options, ""] };
}

/** Removes an option; the right answers after it move up by one. */
export function removeOption(form: QuestionForm, index: number): QuestionForm {
  if (form.options.length <= MIN_OPTIONS) return form;
  return {
    ...form,
    options: form.options.filter((_, i) => i !== index),
    correct: form.correct.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
  };
}

/** Empty boxes at the end are not options (the form starts with 4); returns what is really filled in. */
export function filledOptions(form: QuestionForm): string[] {
  const out = form.options.map((o) => o.trim());
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}

export function validate(form: QuestionForm): QuestionFormError[] {
  const errors: QuestionFormError[] = [];
  if (!form.content.trim()) errors.push("content");
  const options = filledOptions(form);
  if (options.length < MIN_OPTIONS) errors.push("options_min");
  else if (options.some((o) => o === "")) errors.push("option_empty");
  const correct = form.correct.filter((i) => i < options.length);
  if (correct.length === 0) errors.push("correct_none");
  else if (form.type === "SINGLE" && correct.length !== 1) errors.push("correct_single");
  return errors;
}

export function toInput(form: QuestionForm): QuestionBankItemInput {
  const options = filledOptions(form);
  return {
    content: form.content.trim(),
    explanation: form.explanation.trim() || undefined,
    options,
    question_type: form.type,
    correct_answers: form.correct.filter((i) => i < options.length).map((i) => OPTION_LABELS[i]),
    difficulty: form.difficulty,
  };
}
