import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { PRINT_FRAME_CSS, PrintFrame } from "../components/PrintFrame";
import { EXPORT_HEADERS, exportRows, getExam, getResultImageUrl, getResults, scoreText, type ResultRow } from "../examsSpring.api";

// PDF export of any exam: the table (student code, version, class code, total score, right answers); with ?photos=1 on a paper
// exam (OFFLINE / SUBMIT) one block per paper with the photo of the marked sheet follows. Use "In / Lưu PDF" and choose "Save as PDF" - names and Vietnamese
// letters come out exactly as on screen.
const CSS = `
.a4-sheet { width: 210mm; min-height: 297mm; padding: 16mm 14mm; margin: 0 auto 24px; background: #fff; color: #111; box-shadow: 0 2px 16px rgba(0,0,0,.15); box-sizing: border-box; }
.a4-sheet table { width: 100%; border-collapse: collapse; font-size: 12px; }
.a4-sheet th, .a4-sheet td { border: 1px solid #bbb; padding: 4px 8px; text-align: left; }
.a4-sheet th { background: #f1f1f1; }
.a4-paper { break-inside: avoid; page-break-inside: avoid; border: 1px solid #ccc; border-radius: 6px; padding: 8px; margin-bottom: 10px; }
.a4-paper img { max-height: 120mm; max-width: 100%; display: block; margin: 6px auto 0; object-fit: contain; }
${PRINT_FRAME_CSS}
@media print { .a4-sheet { margin: 0; padding: 0 14mm; min-height: 0; width: auto; box-shadow: none; } .a4-sheet + .a4-sheet { break-before: page; page-break-before: always; } }
`;

export function ExamExportPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const withPhotos = params.get("photos") === "1";
  const exam = useQuery({ queryKey: ["exam", id], queryFn: () => getExam(id) });
  const results = useQuery({ queryKey: ["exam", id, "results"], queryFn: () => getResults(id) });
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    const rows = withPhotos ? (results.data?.filter((r) => r.has_image) ?? []) : [];
    if (rows.length === 0) return;
    let cancelled = false;
    const urls: string[] = [];
    setLoadingImages(true);
    (async () => {
      for (let i = 0; i < rows.length && !cancelled; i += 4) {
        const batch = rows.slice(i, i + 4);
        const got = await Promise.all(batch.map(async (r) => { try { return [r.id, await getResultImageUrl(id, r.id)] as const; } catch { return null; } }));
        for (const g of got) if (g) { urls.push(g[1]); if (!cancelled) setImages((m) => ({ ...m, [g[0]]: g[1] })); }
      }
      if (!cancelled) setLoadingImages(false);
    })();
    return () => { cancelled = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [results.data, id, withPhotos]);

  if (exam.isLoading || results.isLoading) return <div className="p-8"><Skeleton className="mx-auto h-96 max-w-3xl" /></div>;
  if (exam.isError || results.isError || !exam.data) return <div role="alert" className="p-8 text-center text-sm text-destructive">{getApiErrorMessage(exam.error ?? results.error, t("exam.export.failed", "Không xuất được file"))}</div>;
  const e = exam.data;
  const rows: ResultRow[] = results.data ?? [];
  const flat = exportRows(rows);

  return (
    <div className="h-full overflow-y-auto bg-muted/40 py-6 print:h-auto print:overflow-visible print:bg-white print:py-0">
      <style>{CSS}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link to={`/exams/${id}?tab=results`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{e.name}</Link>
        <div className="flex items-center gap-3">
          {loadingImages && <span className="text-xs text-muted-foreground" role="status">{t("exam.export.loadingImages", "Đang tải ảnh bài chấm…")}</span>}
          <Button onClick={() => window.print()} disabled={loadingImages} className="gap-2"><Printer className="h-4 w-4" />{t("exam.export.print", "In / Lưu PDF")}</Button>
        </div>
      </div>

      <section className="a4-sheet" data-testid="export-summary">
        <PrintFrame>
        <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: "center" }}>{t("exam.print.exam", "Kỳ thi")} {e.name}</h1>
        <p style={{ textAlign: "center", margin: "4px 0 14px", fontSize: 13 }}>{[e.class_name, e.subject].filter(Boolean).join(" · ")}</p>
        <table>
          <thead><tr><th>{t("exam.col.stt", "STT")}</th><th>{EXPORT_HEADERS[0]}</th><th>{EXPORT_HEADERS[1]}</th><th>{EXPORT_HEADERS[2]}</th><th>{EXPORT_HEADERS[3]}</th><th>{EXPORT_HEADERS[4]}</th></tr></thead>
          <tbody>
            {flat.map((r, i) => (
              <tr key={r.code}><td>{i + 1}</td><td style={{ fontFamily: "monospace" }}>{r.code}</td><td>{r.version}</td><td>{r.className}</td><td><strong>{scoreText(r.score)}</strong></td><td>{r.correct}/{r.questions}</td></tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>{t("exam.results.empty", "Chưa có bài thi nào")}</p>}
        </PrintFrame>
      </section>

      {withPhotos && rows.some((r) => r.has_image) && (
        <section className="a4-sheet" data-testid="export-photos">
          <PrintFrame>
          {rows.filter((r) => r.has_image).map((r) => (
            <div key={r.id} className="a4-paper">
              <strong style={{ fontFamily: "monospace" }}>{r.student_code}</strong> · {r.full_name} · {t("exam.versionLabel", "Mã đề")} {r.test_code ?? "—"} · {r.total_correct ?? 0}/{r.total_questions ?? 0} {t("exam.questionsShort", "câu")} · <strong>{scoreText(r.total_score)} {t("exam.result.points", "điểm")}</strong>{r.is_violation ? ` · ${t("exam.violation.label", "Vi phạm")}` : ""}
              {images[r.id] ? <img src={images[r.id]} alt={t("exam.result.photoAlt", "Ảnh bài chấm của {{name}}", { name: r.full_name })} /> : null}
            </div>
          ))}
          </PrintFrame>
        </section>
      )}
    </div>
  );
}