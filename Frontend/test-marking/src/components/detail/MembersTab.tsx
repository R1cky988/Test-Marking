import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, GraduationCap, Search, UserMinus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getRoster, removeStudent } from "@/features/classes/classDetail.api";
import { ImportStudentsDialog } from "./ImportStudentsDialog";
import { CountPill, EmptyState, PersonAvatar } from "./shared";

export function MembersTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const query = useQuery({ queryKey: ["class-members", classId], queryFn: () => getRoster(classId) });

  const remove = useMutation({
    mutationFn: (id: string) => removeStudent(classId, id),
    onSuccess: () => {
      setToRemove(null);
      void queryClient.invalidateQueries({ queryKey: ["class-members", classId] });
      void queryClient.invalidateQueries({ queryKey: ["class-info", classId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.members.removeFailed", { defaultValue: "Không thể xóa học sinh" }))),
  });

  if (query.isLoading) return <Skeleton className="h-24 w-full rounded-2xl" />;
  if (query.isError)
    return <p className="text-sm text-destructive">{getApiErrorMessage(query.error, t("classes.members.loadFailed", { defaultValue: "Không tải được danh sách thành viên" }))}</p>;
  const roster = query.data!;
  const needle = filter.trim().toLowerCase();
  const students = needle
    ? roster.students.filter((m) => [m.name, m.email, m.student_code].some((v) => (v ?? "").toLowerCase().includes(needle)))
    : roster.students;

  return (
    <div className="space-y-8">
      <section aria-label={t("classes.members.teachers", { defaultValue: "Giáo viên" })} className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          {t("classes.members.teachers", { defaultValue: "Giáo viên" })}
        </h3>
        <ul className="grid gap-2 md:grid-cols-2">
          {roster.teachers.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-brand-soft/60 p-3.5">
              <PersonAvatar person={m} className="h-11 w-11" />
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t("classes.members.students", { defaultValue: "Học sinh" })} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{t("classes.members.students", { defaultValue: "Học sinh" })}</span>
            <CountPill>{roster.student_count}</CountPill>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {roster.students.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9 w-56 pl-8"
                  placeholder={t("classes.members.search", { defaultValue: "Tìm học sinh" })}
                  aria-label={t("classes.members.search", { defaultValue: "Tìm học sinh" })}
                />
              </div>
            )}
            {isTeacher && (
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                {t("classes.importStudents.open", { defaultValue: "Nhập từ Excel" })}
              </Button>
            )}
          </div>
        </div>

        {roster.students.length === 0 && (
          <EmptyState
            icon={<Users />}
            title={t("classes.members.noStudents", { defaultValue: "Lớp chưa có học sinh" })}
            hint={isTeacher ? t("classes.members.noStudentsHint", { defaultValue: "Chia sẻ mã lớp hoặc nhập danh sách từ Excel để thêm học sinh." }) : undefined}
          />
        )}
        {roster.students.length > 0 && students.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("classes.members.noMatch", { defaultValue: "Không có học sinh khớp với tìm kiếm" })}</p>
        )}
        <ul className="grid gap-2 md:grid-cols-2">
          {students.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:bg-muted/40">
              <PersonAvatar person={m} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{m.name}</span>
                  {m.student_code && <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">{m.student_code}</Badge>}
                </p>
                {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
              </div>
              {isTeacher && (
                <Button size="sm" variant="ghost" aria-label={`${t("classes.members.remove", { defaultValue: "Xóa khỏi lớp" })}: ${m.name}`} onClick={() => setToRemove({ id: m.id, name: m.name })}>
                  <UserMinus className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isTeacher && <ImportStudentsDialog classId={classId} open={importOpen} onOpenChange={setImportOpen} />}

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("classes.members.removeTitle", { defaultValue: "Xóa học sinh khỏi lớp?" })}</AlertDialogTitle>
            <AlertDialogDescription>{toRemove?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", { defaultValue: "Hủy" })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove.mutate(toRemove.id)}>
              {t("classes.members.remove", { defaultValue: "Xóa khỏi lớp" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
