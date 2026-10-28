import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { deleteFile, downloadFile, formatFileSize, getFiles, uploadFile, type ClassFile } from "@/features/classes/classDetail.api";
import { CountPill, EmptyState, fmtDateTime, PersonAvatar } from "./shared";

export const FILES_KEY = (classId: string) => ["class-files", classId] as const;

/** Colour by kind of file, from the app's soft tints. */
function fileKind(name: string): { ext: string; tint: string } {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const label = ext.length > 0 && ext.length <= 4 ? ext.toUpperCase() : "FILE";
  if (["pdf"].includes(ext)) return { ext: label, tint: "bg-danger-soft text-danger-foreground" };
  if (["doc", "docx", "rtf", "txt"].includes(ext)) return { ext: label, tint: "bg-info-soft text-info-foreground" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { ext: label, tint: "bg-success-soft text-success-foreground" };
  if (["ppt", "pptx"].includes(ext)) return { ext: label, tint: "bg-warning-soft text-warning-foreground" };
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return { ext: label, tint: "bg-brand-soft text-brand-soft-foreground" };
  return { ext: label, tint: "bg-muted text-muted-foreground" };
}

export function FilesTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const query = useQuery({ queryKey: FILES_KEY(classId), queryFn: () => getFiles(classId) });

  const refresh = () => queryClient.invalidateQueries({ queryKey: FILES_KEY(classId) });
  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(classId, file),
    onSuccess: () => { toast.success(t("classes.files.uploaded", { defaultValue: "Đã tải tệp lên" })); void refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.files.uploadFailed", { defaultValue: "Không thể tải tệp lên" }))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFile(classId, id),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.files.deleteFailed", { defaultValue: "Không thể xóa tệp" }))),
  });
  const download = useMutation({
    mutationFn: (f: ClassFile) => downloadFile(classId, f),
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.files.downloadFailed", { defaultValue: "Không thể tải tệp xuống" }))),
  });

  // files attached to a post are shown on that post; this tab lists the class library
  const files = (query.data ?? []).filter((f) => !f.post_id);
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {t("classes.files.library", { defaultValue: "Tài liệu của lớp" })}
          {query.isSuccess && <CountPill>{files.length}</CountPill>}
        </h3>
        {(
          <>
            <input
              ref={input}
              type="file"
              className="hidden"
              data-testid="file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = "";
              }}
            />
            <Button onClick={() => input.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {t("classes.files.upload", { defaultValue: "Tải tệp lên" })}
            </Button>
          </>
        )}
      </div>

      {query.isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
      {query.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(query.error, t("classes.files.loadFailed", { defaultValue: "Không tải được danh sách tệp" }))}</p>
      )}
      {query.isSuccess && files.length === 0 && (
        <EmptyState
          icon={<FolderOpen />}
          title={t("classes.files.empty", { defaultValue: "Chưa có tệp nào được chia sẻ" })}
          hint={isTeacher
            ? t("classes.files.emptyHint", { defaultValue: "Tải lên đề cương, bài giảng hoặc bài tập để học sinh tải về." })
            : t("classes.files.emptyHintStudent", { defaultValue: "Bạn có thể tải tài liệu lên để cả lớp cùng dùng." })}
        />
      )}

      {files.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {files.map((f) => {
            const kind = fileKind(f.file_name);
            return (
              <li key={f.id} className="flex items-center gap-4 p-3.5 transition-colors hover:bg-muted/40">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold", kind.tint)} aria-hidden>
                  {kind.ext}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.title || f.file_name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(f.file_size)}</span>
                    <span className="flex items-center gap-1"><PersonAvatar person={f.uploaded_by} className="h-4 w-4 text-[9px]" />{f.uploaded_by?.name}</span>
                    <span>{fmtDateTime(f.created_at, locale)}</span>
                  </p>
                </div>
                <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate(f)} aria-label={t("classes.files.download", { defaultValue: "Tải xuống" })}>
                  <Download className="h-4 w-4" />
                </Button>
                {f.can_delete && (
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(f.id)} aria-label={t("classes.files.delete", { defaultValue: "Xóa tệp" })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
