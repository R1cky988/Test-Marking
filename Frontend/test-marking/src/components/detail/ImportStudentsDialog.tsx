import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/apiErrorMessage";
import {
  IMPORT_TEMPLATE_ROWS, importStudents,
  type ImportRowStatus, type ImportStudentsOutcome,
} from "@/features/classes/classDetail.api";

const STATUS_LABEL: Record<ImportRowStatus, { text: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  CREATED: { text: "Đã tạo & gửi email", tone: "default" },
  EXISTS_ADDED: { text: "Đã có tài khoản, đã thêm vào lớp", tone: "secondary" },
  EXISTS_IN_CLASS: { text: "Đã có tài khoản, đã ở trong lớp", tone: "outline" },
  INVALID_EMAIL: { text: "Email không hợp lệ", tone: "destructive" },
  DUPLICATE_IN_FILE: { text: "Trùng trong tệp", tone: "destructive" },
  EMAIL_FAILED: { text: "Gửi email lỗi", tone: "destructive" },
  FAILED: { text: "Lỗi", tone: "destructive" },
};

async function saveTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(IMPORT_TEMPLATE_ROWS);
  ws["!cols"] = [{ wch: 6 }, { wch: 28 }, { wch: 34 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "Mau-them-hoc-sinh.xlsx");
}

/**
 * Teacher of the class: upload an .xlsx with the columns STT, Name, Registed Email.
 * E-mails that already have an account are not recreated but are added to the class; the others get a new account and the login is e-mailed to them.
 */
export function ImportStudentsDialog({
  classId, open, onOpenChange,
}: { classId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportStudentsOutcome | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    if (!open) { setFile(null); setResult(null); setProblems([]); }
  }, [open]);

  const upload = useMutation({
    mutationFn: (f: File) => importStudents(classId, f),
    onSuccess: (r) => {
      setResult(r);
      setProblems([]);
      if (r.created > 0) {
        void queryClient.invalidateQueries({ queryKey: ["class-members", classId] });
        void queryClient.invalidateQueries({ queryKey: ["class-info", classId] });
      }
      const bad = r.invalid + r.failed;
      if (bad > 0) toast.warning(t("classes.importStudents.toastErrors", { count: bad, defaultValue: "{{count}} dòng có vấn đề" }));
      else toast.success(t("classes.importStudents.toastSuccess", { count: r.created, defaultValue: "Đã tạo {{count}} tài khoản và gửi email" }));
    },
    onError: (e) => {
      setProblems(getApiErrorDetails(e).map((d) => (typeof d === "string" ? d : d.message)));
      toast.error(getApiErrorMessage(e, t("classes.importStudents.errors.importFailed", { defaultValue: "Không thể nhập tệp" })));
    },
  });

  const fileOk = !file || /\.xlsx$/i.test(file.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("classes.importStudents.title", { defaultValue: "Nhập học sinh từ Excel" })}</DialogTitle>
          <DialogDescription>
            {t("classes.importStudents.subtitle", {
              defaultValue: "Tệp .xlsx có 3 cột: STT, Name, Registed Email. Email chưa có tài khoản sẽ được tạo tài khoản và nhận mật khẩu qua email; email đã có tài khoản sẽ được bỏ qua. Tối đa 200 dòng mỗi lần.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void saveTemplate()}>
            <Download className="h-4 w-4" />
            {t("classes.importStudents.template", { defaultValue: "Tải mẫu nhập" })}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="import-file">{t("classes.importStudents.fileLabel", { defaultValue: "Tệp danh sách" })}</Label>
            <Input id="import-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setProblems([]); }} />
            {!fileOk && <p role="alert" className="text-sm text-destructive">{t("classes.importStudents.fileType", { defaultValue: "Chỉ nhận tệp Excel .xlsx" })}</p>}
          </div>

          {problems.length > 0 && (
            <div className="space-y-1 rounded-md border border-destructive/40 p-3">
              {problems.map((p) => (
                <p key={p} className="flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{p}</p>
              ))}
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-md border">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-3 text-sm">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="font-medium">{t("classes.importStudents.result.created", { count: result.created, defaultValue: "{{count}} tài khoản mới (đã gửi email)" })}</span>
                <span className="text-muted-foreground">{result.skipped_existing} {t("classes.importStudents.result.existing", { defaultValue: "đã có tài khoản (không tạo mới, đã thêm vào lớp)" })}</span>
                {result.invalid + result.failed > 0 && (
                  <span className="font-medium text-destructive">{result.invalid + result.failed} {t("classes.importStudents.result.problems", { defaultValue: "dòng có vấn đề" })}</span>
                )}
              </div>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">{t("classes.importStudents.table.row", { defaultValue: "Dòng" })}</TableHead>
                      <TableHead>{t("classes.importStudents.table.name", { defaultValue: "Tên" })}</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>{t("classes.importStudents.table.status", { defaultValue: "Kết quả" })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((r) => (
                      <TableRow key={`${r.row}-${r.email}`}>
                        <TableCell>{r.row}</TableCell>
                        <TableCell>{r.name || "-"}</TableCell>
                        <TableCell className="break-all">{r.email || "-"}</TableCell>
                        <TableCell><Badge variant={STATUS_LABEL[r.status]?.tone ?? "outline"} title={r.message}>{STATUS_LABEL[r.status]?.text ?? r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.close", { defaultValue: "Đóng" })}</Button>
          <Button type="button" disabled={!file || !fileOk || upload.isPending} onClick={() => file && upload.mutate(file)}>
            <Upload className="mr-2 h-4 w-4" />
            {upload.isPending ? t("classes.importStudents.importing", { defaultValue: "Đang nhập..." }) : t("classes.importStudents.submit", { defaultValue: "Nhập" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
