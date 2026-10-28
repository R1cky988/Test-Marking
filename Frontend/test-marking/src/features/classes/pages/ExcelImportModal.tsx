import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorDetails, getApiErrorMessage } from "@/lib/apiErrorMessage";
import i18n from "@/i18n";
import type { ImportStudentsResult } from "@/types/academic.types";
import { importStudentsExcel } from "../classes.api";

const importSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, i18n.t("classes.import.fileRequired"))
    .refine((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith(".xlsx") || name.endsWith(".csv");
    }, i18n.t("classes.import.fileType")),
});

type ImportFormValues = z.infer<typeof importSchema>;

interface ExcelImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

export function ExcelImportModal({ open, onOpenChange, onImported }: ExcelImportModalProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState<ImportStudentsResult | null>(null);
  const [apiDetails, setApiDetails] = useState<string[]>([]);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setResult(null);
      setApiDetails([]);
    }
  }, [form, open]);

  async function onSubmit(values: ImportFormValues) {
    try {
      setApiDetails([]);
      const importResult = await importStudentsExcel(values.file);
      setResult(importResult);

      if (importResult.errors.length > 0) {
        toast.warning(t("classes.import.toastErrors", { count: importResult.errors.length }));
      } else {
        toast.success(t("classes.import.toastSuccess", { count: importResult.imported }));
      }

      if (importResult.imported > 0) {
        onImported?.();
      }
    } catch (error) {
      const details = getApiErrorDetails(error).map((detail) =>
        typeof detail === "string" ? detail : detail.message,
      );
      setApiDetails(details);
      toast.error(getApiErrorMessage(error, t("classes.import.errors.importFailed")));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("classes.import.title")}</DialogTitle>
          <DialogDescription>{t("classes.import.subtitle")}</DialogDescription>
        </DialogHeader>

        <form className="min-w-0 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="student-excel">{t("classes.import.fileLabel")}</Label>
            <Controller
              control={form.control}
              name="file"
              render={({ field: { onChange } }) => (
                <Input
                  id="student-excel"
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => onChange(event.target.files?.[0])}
                />
              )}
            />
            {form.formState.errors.file && (
              <p className="text-sm text-danger-foreground">{form.formState.errors.file.message}</p>
            )}
          </div>

          {result && (
            <div className="min-w-0 rounded-md border">
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div className="text-sm">
                  <span className="font-medium">{t("classes.import.result.success", { count: result.imported })}</span>
                  <span className="mx-2 text-muted-foreground/70">|</span>
                  <span className={result.skipped > 0 ? "font-medium text-danger-foreground" : "text-muted-foreground"}>
                    {t("classes.import.result.errors", { count: result.skipped })}
                  </span>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">{t("classes.import.table.row")}</TableHead>
                      <TableHead>{t("classes.import.table.error")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((error) => (
                      <TableRow key={`${error.row}-${error.reason}`}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell className="max-w-[420px] break-words text-danger-foreground">{error.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </div>
          )}

          {apiDetails.length > 0 && (
            <div className="space-y-2 rounded-md border border-danger-soft bg-danger-soft p-3">
              {apiDetails.map((detail) => (
                <div key={detail} className="flex gap-2 text-sm text-danger-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">{detail}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
            <Button type="submit" className="gap-2" disabled={form.formState.isSubmitting}>
              <Upload className="h-4 w-4" />
              {form.formState.isSubmitting ? t("classes.import.importing") : t("classes.import.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
