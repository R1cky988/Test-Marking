import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, FileQuestion, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { CountPill, EmptyState } from "@/components/detail/shared";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoBack } from "@/hooks/useGoBack";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { BankFormDialog } from "../components/BankFormDialog";
import { DifficultyBar } from "../components/DifficultyBar";
import { ImportQuestionsDialog } from "../components/ImportQuestionsDialog";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionEditorDialog } from "../components/QuestionEditorDialog";
import { Segmented } from "../components/Segmented";
import { useDifficultyLabel } from "../components/questionMeta";
import {
  createQuestionBankItem, deleteQuestionBank, deleteQuestionBankItem, getQuestionBank, getQuestionBankItems,
  updateQuestionBank, updateQuestionBankItem,
  type QuestionBankItem, type QuestionBankItemInput, type QuestionBankPayload, type QuestionDifficulty, type QuestionType,
} from "../questionBanks.api";

const PAGE_SIZE = 10;

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

export function QuestionBankDetailPage() {
  const { t } = useTranslation();
  const { bankId = "" } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack("/teacher/question-banks");
  const qc = useQueryClient();
  const difficultyLabel = useDifficultyLabel();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty | "all">("all");
  const [type, setType] = useState<QuestionType | "all">("all");
  const debouncedSearch = useDebounced(search);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<QuestionBankItem | null>(null);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [deleteBankOpen, setDeleteBankOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => { setPage(1); }, [debouncedSearch, difficulty, type]);

  const bank = useQuery({ queryKey: ["question-bank", bankId], queryFn: () => getQuestionBank(bankId), enabled: Boolean(bankId) });
  const items = useQuery({
    queryKey: ["question-bank", bankId, "items", { page, search: debouncedSearch, difficulty, type }],
    queryFn: () => getQuestionBankItems(bankId, { page, limit: PAGE_SIZE, search: debouncedSearch, difficulty, type }),
    enabled: Boolean(bankId),
    placeholderData: keepPreviousData,
  });

  const refreshAll = () => qc.invalidateQueries({ queryKey: ["question-bank", bankId] }).then(() => qc.invalidateQueries({ queryKey: ["question-banks"] }));

  const saveItem = useMutation({
    mutationFn: (input: QuestionBankItemInput) => (editingItem ? updateQuestionBankItem(bankId, editingItem.id, input) : createQuestionBankItem(bankId, input)),
    onSuccess: () => {
      toast.success(editingItem ? t("qb.question.updated", "Đã cập nhật câu hỏi") : t("qb.question.created", "Đã thêm câu hỏi"));
      setEditorOpen(false);
      void refreshAll();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("qb.question.saveFailed", "Không lưu được câu hỏi"))),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => deleteQuestionBankItem(bankId, id),
    onSuccess: () => { toast.success(t("qb.question.deleted", "Đã xóa câu hỏi")); setDeletingItem(null); void refreshAll(); },
    onError: (e) => { toast.error(getApiErrorMessage(e, t("qb.question.deleteFailed", "Không xóa được câu hỏi"))); setDeletingItem(null); },
  });

  const saveBank = useMutation({
    mutationFn: (payload: QuestionBankPayload) => updateQuestionBank(bankId, payload),
    onSuccess: () => { toast.success(t("qb.bank.updated", "Đã cập nhật ngân hàng")); setBankDialogOpen(false); void refreshAll(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("qb.bank.saveFailed", "Không lưu được ngân hàng"))),
  });

  const removeBank = useMutation({
    mutationFn: () => deleteQuestionBank(bankId),
    onSuccess: () => { toast.success(t("qb.bank.deleted", "Đã xóa ngân hàng")); void qc.invalidateQueries({ queryKey: ["question-banks"] }); navigate("/teacher/question-banks", { replace: true }); },
    onError: (e) => { toast.error(getApiErrorMessage(e, t("qb.bank.deleteFailed", "Không xóa được ngân hàng"))); setDeleteBankOpen(false); },
  });

  const b = bank.data;
  const list = items.data?.data ?? [];
  const total = items.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtering = Boolean(debouncedSearch.trim()) || difficulty !== "all" || type !== "all";

  function clearFilters() { setSearch(""); setDifficulty("all"); setType("all"); }

  if (bank.isError) {
    return (
      <div className="space-y-4">
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("qb.back", "Ngân hàng câu hỏi")}</button>
        <div role="alert" className="rounded-2xl border border-destructive/30 p-8 text-center text-sm text-destructive">{getApiErrorMessage(bank.error, t("qb.bank.loadFailed", "Không tải được ngân hàng câu hỏi"))}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={goBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("qb.back", "Ngân hàng câu hỏi")}
      </button>

      {/* header */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-brand-soft via-primary/40 to-primary" />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            {b?.subject && <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-soft-foreground"><BookOpen className="h-3 w-3" />{b.subject}</span>}
            {b ? <h1 className="break-words text-3xl font-semibold">{b.name}</h1> : <Skeleton className="h-9 w-64" />}
            {b?.description && <p className="max-w-2xl break-words text-muted-foreground">{b.description}</p>}
            {b && (
              <div className="max-w-md pt-2">
                <div className="mb-2 flex items-baseline gap-2"><span className="text-3xl font-semibold tabular-nums">{b.items_count}</span><span className="text-sm text-muted-foreground">{t("qb.bank.questions", "câu hỏi")}</span></div>
                <DifficultyBar easy={b.difficulty_counts.easy} medium={b.difficulty_counts.medium} hard={b.difficulty_counts.hard} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBankDialogOpen(true)} disabled={!b}><Pencil className="h-4 w-4" />{t("qb.bank.editShort", "Sửa thông tin")}</Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteBankOpen(true)} disabled={!b}><Trash2 className="h-4 w-4" />{t("qb.delete", "Xóa")}</Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />{t("qb.import.button", "Nhập từ Excel")}</Button>
            <Button className="gap-2" onClick={() => { setEditingItem(null); setEditorOpen(true); }}><Plus className="h-4 w-4" />{t("qb.question.add", "Thêm câu hỏi")}</Button>
          </div>
        </div>
      </section>

      {/* filters */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("qb.filter.search", "Tìm trong nội dung câu hỏi")} aria-label={t("qb.filter.search", "Tìm trong nội dung câu hỏi")} className="rounded-full pl-9" />
        </div>
        <Segmented<QuestionDifficulty | "all">
          label={t("qb.filter.difficulty", "Độ khó")}
          value={difficulty}
          onChange={setDifficulty}
          size="sm"
          options={[
            { value: "all", label: t("qb.filter.all", "Tất cả") },
            { value: "EASY", label: difficultyLabel("EASY") },
            { value: "MEDIUM", label: difficultyLabel("MEDIUM") },
            { value: "HARD", label: difficultyLabel("HARD") },
          ]}
        />
        <Select value={type} onValueChange={(v) => setType(v as QuestionType | "all")}>
          <SelectTrigger className="w-full rounded-full lg:w-44" aria-label={t("qb.filter.type", "Loại câu hỏi")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("qb.filter.allTypes", "Mọi loại")}</SelectItem>
            <SelectItem value="SINGLE">{t("qb.type.single", "Một đáp án")}</SelectItem>
            <SelectItem value="MULTIPLE">{t("qb.type.multiple", "Nhiều đáp án")}</SelectItem>
          </SelectContent>
        </Select>
        {filtering && <Button variant="ghost" size="sm" onClick={clearFilters}>{t("qb.filter.clear", "Xóa bộ lọc")}</Button>}
      </section>

      {/* list */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {t("qb.question.list", "Danh sách câu hỏi")}
          <CountPill>{total}</CountPill>
        </div>

        {items.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
        ) : items.isError ? (
          <div role="alert" className="rounded-2xl border border-destructive/30 p-6 text-center text-sm text-destructive">
            {getApiErrorMessage(items.error, t("qb.question.loadFailed", "Không tải được câu hỏi"))}
            <Button variant="outline" size="sm" className="ml-3" onClick={() => void items.refetch()}>{t("qb.retry", "Thử lại")}</Button>
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<FileQuestion />}
            title={filtering ? t("qb.question.noMatch", "Không có câu hỏi nào khớp bộ lọc") : t("qb.question.empty", "Ngân hàng này chưa có câu hỏi")}
            hint={filtering ? undefined : t("qb.question.emptyHint", "Bấm \"Thêm câu hỏi\" hoặc nhập nhiều câu cùng lúc từ Excel.")}
          />
        ) : (
          <div className={items.isPlaceholderData ? "space-y-3 opacity-60 transition-opacity" : "space-y-3"}>
            {list.map((item, i) => (
              <QuestionCard
                key={item.id}
                item={item}
                number={total - ((page - 1) * PAGE_SIZE + i)}
                onEdit={() => { setEditingItem(item); setEditorOpen(true); }}
                onDelete={() => setDeletingItem(item)}
              />
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <nav className="flex items-center justify-center gap-3 pt-2" aria-label={t("qb.pagination", "Phân trang")}>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t("qb.prev", "Trang trước")}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm tabular-nums text-muted-foreground">{t("qb.pageOf", "Trang {{page}} / {{pages}}", { page, pages })}</span>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label={t("qb.next", "Trang sau")}><ChevronRight className="h-4 w-4" /></Button>
          </nav>
        )}
      </section>

      <QuestionEditorDialog open={editorOpen} onOpenChange={setEditorOpen} item={editingItem} saving={saveItem.isPending} onSave={(input) => saveItem.mutate(input)} />
      <BankFormDialog open={bankDialogOpen} onOpenChange={setBankDialogOpen} bank={b ?? null} saving={saveBank.isPending} onSave={(p) => saveBank.mutate(p)} />
      <ImportQuestionsDialog bankId={bankId} open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(o) => !o && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("qb.question.deleteTitle", "Xóa câu hỏi này?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("qb.question.deleteDesc", "Câu hỏi sẽ bị xóa khỏi ngân hàng. Không thể hoàn tác.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("qb.cancel", "Hủy")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deletingItem && removeItem.mutate(deletingItem.id)}>{t("qb.delete", "Xóa")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBankOpen} onOpenChange={setDeleteBankOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("qb.bank.deleteTitle", "Xóa ngân hàng câu hỏi?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("qb.bank.deleteDesc", "\"{{name}}\" và toàn bộ {{count}} câu hỏi trong đó sẽ bị xóa. Không thể hoàn tác.", { name: b?.name, count: b?.items_count ?? 0 })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("qb.cancel", "Hủy")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => removeBank.mutate()}>{t("qb.delete", "Xóa")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
