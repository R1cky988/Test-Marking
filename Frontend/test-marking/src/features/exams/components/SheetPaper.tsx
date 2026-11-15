import { useTranslation } from "react-i18next";

import type { ResultAnswer } from "../examsSpring.api";

const split = (v: string | null | undefined) => (v ?? "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);

/**
 * The paper of a student after marking (OFFLINE / SUBMIT exams), as the answer sheet: one bubble per option.
 * Green = ticked and right, red = ticked and wrong, yellow = the right option he did not tick. No question text.
 */
export function SheetPaper({ answers }: { answers: ResultAnswer[] }) {
  const { t } = useTranslation();
  let top = "D";
  for (const a of answers) for (const c of [...split(a.choice), ...split(a.correct_answer)]) if (c > top) top = c;
  const letters: string[] = [];
  for (let c = "A".charCodeAt(0); c <= top.charCodeAt(0); c++) letters.push(String.fromCharCode(c));

  return (
    <div>
      <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("exam.sheet.legend", "Chú thích màu")}>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-emerald-500" />{t("exam.sheet.right", "Chọn đúng")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-rose-500" />{t("exam.sheet.wrong", "Chọn sai")}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-yellow-400" />{t("exam.sheet.missed", "Đáp án đúng bị bỏ sót")}</span>
      </p>
      <ol className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2" data-testid="graded-sheet">
        {answers.map((a) => {
          const picked = new Set(split(a.choice));
          const right = new Set(split(a.correct_answer));
          return (
            <li key={a.order} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
              <span className={`w-14 shrink-0 text-sm font-semibold tabular-nums ${a.is_correct ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{t("exam.result.questionNo", "Câu {{n}}", { n: a.order })}</span>
              <span className="flex gap-2">
                {letters.map((l) => {
                  const isPicked = picked.has(l);
                  const isRight = right.has(l);
                  const tone = isPicked && isRight ? "border-emerald-500 bg-emerald-500 text-white"
                    : isPicked ? "border-rose-500 bg-rose-500 text-white"
                    : isRight && !a.is_correct ? "border-yellow-400 bg-yellow-300 text-yellow-950"
                    : "border-border text-muted-foreground";
                  return <span key={l} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${tone}`}>{l}</span>;
                })}
              </span>
              {picked.size === 0 && <span className="text-xs text-muted-foreground">{t("exam.result.blank", "Bỏ trống")}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
