import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { IMPORT_QUESTION_TEMPLATE_ROWS, importQuestionBankFile, type ImportQuestionsResult } from "../questionBanks.api";

async function saveTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(IMPORT_QUESTION_TEMPLATE_ROWS);
  ws["!cols"] = [{ wch: 6 }, { wch: 46 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 36 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Câu hỏi");
  XLSX.writeFile(wb, "Mau-nhap-de.xlsx");
}

export function ImportQuestionsDialog({ bankId, open, onOpenChange }: { bankId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<ImportQuestionsResult | null>(null);

  const run = useMutation({
    mutationFn: (f: File) => importQuestionBankFile(bankId, f),
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ["question-bank", bankId] });
      void qc.invalidateQueries({ queryKey: ["question-banks"] });
      if (r.imported > 0) toast.success(t("qb.import.done", "Đã thêm {{count}} câu hỏi", { count: r.imported }));
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("qb.import.failed", "Không import được tệp"))),
  });

  function reset(next: boolean) {
    if (!next) { setFile(null); setResult(null); setFileError(""); run.reset(); }
    onOpenChange(next);
  }

  function pick(f: File | undefined) {
    setResult(null);
    if (!f) { setFile(null); return; }
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setFileError(t("qb.import.onlyXlsx", "Chỉ nhận tệp Excel .xlsx"));
      return;
    }
    setFileError("");
    setFile(f);
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("qb.import.title", "Nhập câu hỏi từ Excel")}</DialogTitle>
          <DialogDescription>
            {t("qb.import.desc", "Cột bắt buộc: Nội dung câu hỏi, ít nhất 2 đáp án (A–E) và Đáp án đúng. Nhiều đáp án đúng viết cách nhau bằng dấu phẩy (B,C). Có thể viết LaTeX trong mọi ô.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void saveTemplate()}>
            <Download className="h-4 w-4" />
            {t("qb.import.template", "Tải mẫu nhập")}
          </Button>

          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:border-primary hover:bg-brand-soft/40"
          >
            {file ? <FileSpreadsheet className="h-7 w-7 text-emerald-600" /> : <Upload className="h-7 w-7 text-muted-foreground" />}
            <span className="text-sm font-medium">{file ? file.name : t("qb.import.choose", "Chọn tệp .xlsx")}</span>
            <span className="text-xs text-muted-foreground">{t("qb.import.limit", "Tối đa 500 câu và 5MB mỗi lần")}</span>
          </button>
          <input ref={input} type="file" accept=".xlsx" aria-label={t("qb.import.fileLabel", "Tệp câu hỏi")} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}

          {result && (
            <div className="space-y-2 rounded-xl border p-3 text-sm" role="status">
              <p>
                <span className="font-semibold text-emerald-600">{t("qb.import.done", "Đã thêm {{count}} câu hỏi", { count: result.imported })}</span>
                {result.skipped > 0 && <span className="ml-2 text-destructive">{t("qb.import.skipped", "{{count}} dòng bị bỏ qua", { count: result.skipped })}</span>}
              </p>
              {result.errors.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
                  {result.errors.map((e) => <li key={e.row}>{t("qb.import.rowError", "Dòng {{row}}: {{reason}}", { row: e.row, reason: e.reason })}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => reset(false)}>{result ? t("qb.close", "Đóng") : t("qb.cancel", "Hủy")}</Button>
          <Button type="button" disabled={!file || run.isPending} onClick={() => file && run.mutate(file)}>
            {run.isPending ? t("qb.import.running", "Đang nhập...") : t("qb.import.submit", "Nhập câu hỏi")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
