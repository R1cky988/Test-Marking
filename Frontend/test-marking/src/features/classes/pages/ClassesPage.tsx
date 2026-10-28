import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Archive, Clipboard, Edit, Plus, RefreshCw, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ListPagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import type { ClassApprovalMode, ClassListItem } from "@/types/academic.types";
import { createClass, deleteClass, getClass, getClasses, restoreClass, updateClass, joinClassByCode  } from "../classes.api";
import { useAuthStore } from "@/store/useAuthStore";

const classFormSchema = z.object({
  class_name: z.string().trim().min(1, i18n.t("classesPage.validation.nameRequired")),
  subject: z.string().trim().min(1, i18n.t("classesPage.validation.subjectRequired")),
  description: z.string().trim().optional(),
  approval_mode: z.enum(["auto_approve", "manual_approve", "no_approval"]),
});


type ClassFormValues = z.infer<typeof classFormSchema>;

const defaultValues: ClassFormValues = {
  class_name: "",
  subject: "",
  description: "",
  approval_mode: "manual_approve",
};

const approvalModeLabels: Record<ClassApprovalMode, string> = {
  auto_approve: i18n.t("classesPage.approvalModes.auto_approve"),
  manual_approve: i18n.t("classesPage.approvalModes.manual_approve"),
  no_approval: i18n.t("classesPage.approvalModes.no_approval"),
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function toFormText(value: string | null | undefined) {
  return value ?? "";
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "active") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t("classesPage.statusLabels.active")}</Badge>;
  }
  return (
    <Badge variant="secondary" className="bg-muted text-foreground/80 hover:bg-muted">
      {t("classesPage.statusLabels.archived")}
    </Badge>
  );
}

export function ClassesPage() {
  const { t } = useTranslation();
  // No global teacher / student split: whoever created a class teaches it (classItem.is_teacher),
  // whoever joined it is a student there. Everybody can create and join classes.
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassListItem | null>(null);
  const [archivingClass, setArchivingClass] = useState<ClassListItem | null>(null);
  const [restoringClass, setRestoringClass] = useState<ClassListItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "student">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const editFetchSeq = useRef(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues,
  });

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getClasses({
        status: statusFilter === "all" ? undefined : statusFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        page,
        limit,
      });
      setClasses(response.data);
      setTotal(response.meta.total);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("classesPage.toasts.loadFailed")));
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, statusFilter, roleFilter, t]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, roleFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openCreateDialog() {
    editFetchSeq.current += 1;
    setEditingClass(null);
    form.reset(defaultValues);
    setOpen(true);
  }

  function handleClassDialogOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      editFetchSeq.current += 1;
    }
  }

  function resetClassForm(classItem: ClassListItem) {
    form.reset({
      class_name: classItem.class_name,
      subject: toFormText(classItem.subject),
      description: toFormText(classItem.description),
      approval_mode: classItem.approval_mode,
    });
  }

  function isClassFormStillShowing(classItem: ClassListItem) {
    const values = form.getValues();
    return (
      values.class_name === classItem.class_name &&
      values.subject === toFormText(classItem.subject) &&
      values.description === toFormText(classItem.description) &&
      values.approval_mode === classItem.approval_mode
    );
  }

  async function openEditDialog(classItem: ClassListItem) {
    const requestSeq = editFetchSeq.current + 1;
    editFetchSeq.current = requestSeq;
    setEditingClass(classItem);
    resetClassForm(classItem);
    setOpen(true);

    try {
      const freshClass = await getClass(classItem.id);
      if (editFetchSeq.current !== requestSeq) return;
      setEditingClass(freshClass);
      setClasses((current) =>
        current.map((currentClass) =>
          currentClass.id === freshClass.id
            ? { ...currentClass, ...freshClass, student_count: currentClass.student_count }
            : currentClass,
        ),
      );
      if (isClassFormStillShowing(classItem)) {
        resetClassForm(freshClass);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("classesPage.toasts.loadFailed")));
    }
  }

  async function onSubmit(values: ClassFormValues) {
    try {
      setIsSaving(true);
      const payload = {
        class_name: values.class_name.trim(),
        subject: values.subject.trim(),
        description: normalizeOptionalText(values.description),
        approval_mode: values.approval_mode,
      };

      if (editingClass) {
        const updatedClass = await updateClass(editingClass.id, payload);
        const savedClass = { ...updatedClass, ...payload };
        setClasses((current) =>
          current.map((classItem) =>
            classItem.id === editingClass.id
              ? { ...classItem, ...savedClass, student_count: classItem.student_count }
              : classItem,
          ),
        );
        setEditingClass((current) => (current?.id === editingClass.id ? { ...current, ...savedClass } : current));
        toast.success(t("classesPage.toasts.updated"));
      } else {
        const createdClass = await createClass(payload);
        const savedClass = { ...createdClass, ...payload, student_count: 0 };
        const matchesStatus = statusFilter === "all" || savedClass.status === statusFilter;
        if (matchesStatus) {
          setClasses((current) => [savedClass, ...current].slice(0, limit));
          setTotal((current) => current + 1);
        }
        toast.success(t("classesPage.toasts.created"));
      }

      editFetchSeq.current += 1;
      setOpen(false);
      form.reset(defaultValues);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("classesPage.toasts.saveFailed")));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmArchive() {
    if (!archivingClass) return;

    try {
      setIsArchiving(true);
      await deleteClass(archivingClass.id);
      toast.success(t("classesPage.toasts.archived"));
      setArchivingClass(null);
      await loadClasses();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("classesPage.toasts.archiveFailed")));
    } finally {
      setIsArchiving(false);
    }
  }

  async function confirmRestore() {
    if (!restoringClass) return;

    try {
      setIsRestoring(true);
      await restoreClass(restoringClass.id);
      toast.success(t("classesPage.toasts.restored"));
      setRestoringClass(null);
      await loadClasses();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("classesPage.toasts.restoreFailed")));
    } finally {
      setIsRestoring(false);
    }
  }

  function copyJoinCode(classItem: ClassListItem) {
    if (!classItem.join_code) return;
    void navigator.clipboard.writeText(classItem.join_code);
    toast.success(t("classesPage.toasts.codeCopied"));
  }

  
  async function handleJoinClass() {
    const code = joinCode.trim();

    if (!code) {
      toast.error("Vui lòng nhập mã lớp");
      return;
    }

    try {
      setIsJoining(true);

      const result = await joinClassByCode({
        join_code: code,
        message: joinMessage,
      });

      if (result.status === "PENDING") {
        toast.success("Đã gửi yêu cầu. Vui lòng chờ giáo viên duyệt.");
      } else if (result.status === "JOINED") {
        toast.success("Bạn đã tham gia lớp thành công.");
      } else {
        toast.success("Yêu cầu tham gia lớp đã được xử lý.");
      }

      setJoinDialogOpen(false);
      setJoinCode("");
      setJoinMessage("");

      await loadClasses();
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Không thể tham gia lớp học."),
      );
    } finally {
      setIsJoining(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t("classesPage.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("classesPage.subtitle")}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setJoinDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("classesPage.joinClass", { defaultValue: "Tham gia lớp" })}
          </Button>
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            {t("classesPage.addClass")}
          </Button>
        </div>

      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>{t("classesPage.listTitle")}</CardTitle>
              <CardDescription>{t("classesPage.listDesc")}</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-3">
            <div className="w-[180px] space-y-2">
              <Label>{t("classesPage.roleFilter", { defaultValue: "Vai trò của tôi" })}</Label>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | "teacher" | "student")}>
                <SelectTrigger aria-label={t("classesPage.roleFilter", { defaultValue: "Vai trò của tôi" })}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("classesPage.roleAll", { defaultValue: "Tất cả lớp" })}</SelectItem>
                  <SelectItem value="teacher">{t("classesPage.roleTeaching", { defaultValue: "Lớp tôi là giáo viên" })}</SelectItem>
                  <SelectItem value="student">{t("classesPage.roleStudying", { defaultValue: "Lớp tôi là học sinh" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(
              <div className="w-[180px] space-y-2">
                <Label>{t("classesPage.status")}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {t("classesPage.statusLabels.active")}
                    </SelectItem>
                    <SelectItem value="archived">
                      {t("classesPage.statusLabels.archived")}
                    </SelectItem>
                    <SelectItem value="all">
                      {t("common.all")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void loadClasses()}
            >
              <RefreshCw className="h-4 w-4" />
              {t("classesPage.refresh")}
            </Button>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("classesPage.table.name")}</TableHead>
                <TableHead>{t("classesPage.table.subject")}</TableHead>
                <TableHead>{t("classesPage.table.myRole", { defaultValue: "Vai trò" })}</TableHead>
                <TableHead>{t("classesPage.table.joinCode")}</TableHead>
                <TableHead>{t("classesPage.table.members")}</TableHead>
                <TableHead>{t("classesPage.table.approvalMode")}</TableHead>
                <TableHead>{t("classesPage.table.status")}</TableHead>
                <TableHead className="w-[140px] text-right">{t("classesPage.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classItem) => (
                <TableRow key={classItem.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-[280px] space-y-0.5">
                      <Link to={`/classes/${classItem.id}`} className="block truncate text-brand-soft-foreground hover:text-primary">
                        {classItem.class_name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{classItem.subject || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={classItem.is_teacher ? "default" : "secondary"}>
                      {classItem.is_teacher
                        ? t("classesPage.roleTeacher", { defaultValue: "Giáo viên" })
                        : t("classesPage.roleStudent", { defaultValue: "Học sinh" })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {classItem.is_teacher ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 gap-2 px-2 font-mono"
                        onClick={() => copyJoinCode(classItem)}
                      >
                        <Clipboard className="h-3.5 w-3.5" />
                        {classItem.join_code || "-"}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground/70" />
                      {classItem.student_count}
                    </span>
                  </TableCell>
                  <TableCell>{approvalModeLabels[classItem.approval_mode] ?? classItem.approval_mode}</TableCell>
                  <TableCell><StatusBadge status={classItem.status} /></TableCell>
                  <TableCell>
                  {classItem.is_teacher && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void openEditDialog(classItem)}
                        title={t("classesPage.editTooltip")}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {classItem.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setArchivingClass(classItem)}
                          title={t("classesPage.archiveTooltip")}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRestoringClass(classItem)}
                          title={t("classesPage.restoreTooltip")}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
                </TableRow>
              ))}
              {!isLoading && classes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t("classesPage.empty")}
                  </TableCell>
                </TableRow>
              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t("classesPage.loading")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-6">
            <ListPagination
              page={page}
              limit={limit}
              total={total}
              isLoading={isLoading}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      <Dialog
        open={open}
        onOpenChange={handleClassDialogOpenChange}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClass
                ? t("classesPage.editTooltip")
                : t("classesPage.addClass")}
            </DialogTitle>
            <DialogDescription>
              {editingClass
                ? "Cập nhật thông tin lớp học."
                : "Nhập thông tin để tạo lớp học mới."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="class_name">Tên lớp học</Label>
              <Input
                id="class_name"
                {...form.register("class_name")}
                placeholder="Nhập tên lớp học"
              />
              {form.formState.errors.class_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.class_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Môn học</Label>
              <Input
                id="subject"
                {...form.register("subject")}
                placeholder="Nhập môn học"
              />
              {form.formState.errors.subject && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Mô tả lớp học (không bắt buộc)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval_mode">Chế độ duyệt thành viên</Label>
              <Controller
                control={form.control}
                name="approval_mode"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="approval_mode">
                      <SelectValue placeholder="Chọn chế độ duyệt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_approve">
                        {t("classesPage.approvalModes.auto_approve")}
                      </SelectItem>
                      <SelectItem value="manual_approve">
                        {t("classesPage.approvalModes.manual_approve")}
                      </SelectItem>
                      <SelectItem value="no_approval">
                        {t("classesPage.approvalModes.no_approval")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => handleClassDialogOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Đang lưu..."
                  : editingClass
                    ? "Lưu thay đổi"
                    : "Tạo lớp học"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      <Dialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tham gia lớp học</DialogTitle>
            <DialogDescription>
              Nhập mã lớp do giáo viên cung cấp để gửi yêu cầu tham gia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="join-code">Mã lớp</Label>
            <Input
              id="join-code"
              placeholder="Ví dụ: ABC123"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="join-message">
              Lời nhắn (không bắt buộc)
            </Label>
            <Textarea
              id="join-message"
              placeholder="Lời nhắn gửi giáo viên..."
              value={joinMessage}
              onChange={(event) => setJoinMessage(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isJoining}
              onClick={() => setJoinDialogOpen(false)}
            >
              Hủy
            </Button>

            <Button
              type="button"
              disabled={isJoining || !joinCode.trim()}
              onClick={() => void handleJoinClass()}
            >
              {isJoining ? "Đang gửi..." : "Gửi yêu cầu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archivingClass)} onOpenChange={(nextOpen) => !nextOpen && setArchivingClass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("classesPage.archive.title")}</DialogTitle>
            <DialogDescription>
              {t("classesPage.archive.desc", { name: archivingClass?.class_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {t("classesPage.archive.note")}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchivingClass(null)} disabled={isArchiving}>
              {t("classesPage.archive.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmArchive()} disabled={isArchiving}>
              {isArchiving ? t("classesPage.archive.archiving") : t("classesPage.archive.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(restoringClass)} onOpenChange={(nextOpen) => !nextOpen && setRestoringClass(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("classesPage.restore.title")}</DialogTitle>
            <DialogDescription>
              {t("classesPage.restore.desc", { name: restoringClass?.class_name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRestoringClass(null)} disabled={isRestoring}>
              {t("classesPage.restore.cancel")}
            </Button>
            <Button type="button" variant="success" onClick={() => void confirmRestore()} disabled={isRestoring}>
              {isRestoring ? t("classesPage.restore.restoring") : t("classesPage.restore.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}