import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Library, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import { EmptyState } from "@/components/detail/shared";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { BankFormDialog } from "../components/BankFormDialog";
import { DifficultyBar } from "../components/DifficultyBar";
import {
  createQuestionBank, deleteQuestionBank, getQuestionBanks, updateQuestionBank,
  type QuestionBankInfo, type QuestionBankPayload,
} from "../questionBanks.api";

export function QuestionBanksListPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankInfo | null>(null);
  const [deleting, setDeleting] = useState<QuestionBankInfo | null>(null);

  const banks = useQuery({ queryKey: ["question-banks", search.trim()], queryFn: () => getQuestionBanks(search), placeholderData: (prev) => prev });
  const refresh = () => qc.invalidateQueries({ queryKey: ["question-banks"] });

  const save = useMutation({
    mutationFn: (payload: QuestionBankPayload) => (editing ? updateQuestionBank(editing.id, payload) : createQuestionBank(payload)),
    onSuccess: () => {
      toast.success(editing ? t("qb.bank.updated", "Đã cập nhật ngân hàng") : t("qb.bank.created", "Đã tạo ngân hàng câu hỏi"));
      setDialogOpen(false);
      void refresh();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("qb.bank.saveFailed", "Không lưu được ngân hàng"))),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteQuestionBank(id),
    onSuccess: () => { toast.success(t("qb.bank.deleted", "Đã xóa ngân hàng")); setDeleting(null); void refresh(); },
    onError: (e) => { toast.error(getApiErrorMessage(e, t("qb.bank.deleteFailed", "Không xóa được ngân hàng"))); setDeleting(null); },
  });

  const list = banks.data ?? [];
  const fmt = (v: string | null) => (v ? new Intl.DateTimeFormat(locale).format(new Date(v)) : "");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t("qb.title", "Ngân hàng câu hỏi")}</h1>
          <p className="mt-1 text-muted-foreground">{t("qb.subtitle", "Soạn câu hỏi trắc nghiệm bằng LaTeX, một hoặc nhiều đáp án, rồi dùng lại cho nhiều kỳ thi.")}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          {t("qb.bank.new", "Tạo ngân hàng")}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("qb.bank.search", "Tìm theo tên hoặc môn học")} aria-label={t("qb.bank.search", "Tìm theo tên hoặc môn học")} className="rounded-full pl-9" />
      </div>

      {banks.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : banks.isError ? (
        <div role="alert" className="rounded-2xl border border-destructive/30 p-6 text-center text-sm text-destructive">
          {getApiErrorMessage(banks.error, t("qb.bank.loadFailed", "Không tải được danh sách ngân hàng"))}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => void banks.refetch()}>{t("qb.retry", "Thử lại")}</Button>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Library />}
          title={search.trim() ? t("qb.bank.noMatch", "Không có ngân hàng nào khớp") : t("qb.bank.empty", "Bạn chưa có ngân hàng câu hỏi nào")}
          hint={search.trim() ? undefined : t("qb.bank.emptyHint", "Tạo ngân hàng đầu tiên rồi thêm câu hỏi vào đó.")}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((bank) => (
            <li key={bank.id} className="group relative flex flex-col rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
              <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-brand-soft via-primary/40 to-primary" />
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {bank.subject && <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-soft-foreground"><BookOpen className="h-3 w-3" />{bank.subject}</span>}
                    <h2 className="truncate text-lg font-semibold">
                      <Link to={`/teacher/question-banks/${bank.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">{bank.name}</Link>
                    </h2>
                    {bank.description && <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{bank.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tabular-nums leading-none">{bank.items_count}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("qb.bank.questions", "câu hỏi")}</p>
                  </div>
                </div>
                <div className="mt-auto space-y-3">
                  <DifficultyBar easy={bank.difficulty_counts.easy} medium={bank.difficulty_counts.medium} hard={bank.difficulty_counts.hard} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{bank.updated_at || bank.created_at ? t("qb.bank.updatedAt", "Cập nhật {{date}}", { date: fmt(bank.updated_at ?? bank.created_at) }) : ""}</span>
                    <span className="relative z-10 flex gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(bank); setDialogOpen(true); }} aria-label={t("qb.bank.edit", "Sửa ngân hàng {{name}}", { name: bank.name })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(bank)} aria-label={t("qb.bank.delete", "Xóa ngân hàng {{name}}", { name: bank.name })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BankFormDialog open={dialogOpen} onOpenChange={setDialogOpen} bank={editing} saving={save.isPending} onSave={(p) => save.mutate(p)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("qb.bank.deleteTitle", "Xóa ngân hàng câu hỏi?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("qb.bank.deleteDesc", "\"{{name}}\" và toàn bộ {{count}} câu hỏi trong đó sẽ bị xóa. Không thể hoàn tác.", { name: deleting?.name, count: deleting?.items_count ?? 0 })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("qb.cancel", "Hủy")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleting && remove.mutate(deleting.id)}>{t("qb.delete", "Xóa")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
