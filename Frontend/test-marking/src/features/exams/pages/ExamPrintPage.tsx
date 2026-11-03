import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { LatexContent } from "@/components/latex/LatexContent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getExamPrint } from "../examsSpring.api";

// A4 print sheet: one page (or more, if long) per version. Centered on top: "Kỳ thi {examName}", under it the version code,
// then the questions with their options. A long version flows onto the next page (a question is never split); the page
// margins come from @page so every continuation page keeps them. The toolbar is hidden when printing; use "Save as PDF" in the print dialog for a file.
const PRINT_CSS = `
.a4-sheet { width: 210mm; min-height: 297mm; padding: 18mm 16mm; margin: 0 auto 24px; background: #fff; color: #111; box-shadow: 0 2px 16px rgba(0,0,0,.15); box-sizing: border-box; }
.a4-sheet .latex-content { color: #111; }
@media print {
  @page { size: A4; margin: 18mm 16mm; }
  html, body, #root { background: #fff !important; height: auto !important; overflow: visible !important; }
  .no-print { display: none !important; }
  .a4-sheet { margin: 0; padding: 0; min-height: 0; width: auto; box-shadow: none; page-break-after: always; break-after: page; }
  .a4-sheet:last-child { page-break-after: auto; break-after: auto; }
  .a4-question { break-inside: avoid; page-break-inside: avoid; }
}
`;

export function ExamPrintPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const [showKey, setShowKey] = useState(false);
  const data = useQuery({ queryKey: ["exam", id, "print"], queryFn: () => getExamPrint(id) });

  if (data.isLoading) return <div className="p-8"><Skeleton className="mx-auto h-96 max-w-3xl" /></div>;
  if (data.isError || !data.data) return <div role="alert" className="p-8 text-center text-sm text-destructive">{getApiErrorMessage(data.error, t("exam.print.failed", "Không tải được dữ liệu in"))}</div>;
  const { exam_name, versions } = data.data;

  return (
    <div className="h-full overflow-y-auto bg-muted/40 py-6 print:h-auto print:overflow-visible print:bg-white print:py-0">
      <style>{PRINT_CSS}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link to={`/exams/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{exam_name}</Link>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} />{t("exam.print.key", "Kèm đáp án (bản cho giáo viên)")}</label>
          <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" />{t("exam.print.print", "In / Lưu PDF")}</Button>
        </div>
      </div>

      {versions.length === 0 && <p className="no-print text-center text-sm text-muted-foreground">{t("exam.noVersions", "Chưa có mã đề")}</p>}

      {versions.map((v) => (
        <section key={v.id} className="a4-sheet" aria-label={`${t("exam.versionLabel", "Mã đề")} ${v.code}`} data-testid="a4-sheet">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold uppercase tracking-wide">{t("exam.print.exam", "Kỳ thi")} {exam_name}</h1>
            <p className="mt-2 text-lg font-semibold">{t("exam.versionLabel", "Mã đề")}: <span className="tabular-nums">{v.code}</span></p>
          </header>
          <ol className="space-y-4 text-[13px]">
            {v.questions.map((q) => (
              <li key={q.question_id} className="a4-question">
                <div className="flex gap-1.5"><strong>{t("exam.print.q", "Câu")} {q.order}.</strong><LatexContent text={q.content} /></div>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 pl-5">
                  {q.options.map((o) => (
                    <li key={o.label} className={showKey && q.correct_answers.includes(o.label) ? "font-bold underline" : ""}>
                      <span className="mr-1 font-semibold">{o.label}.</span><span className="inline-block align-top"><LatexContent text={o.content} /></span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}