import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Layers, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import { EmptyState } from "@/components/detail/shared";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/features/questions/components/Segmented";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getClasses } from "@/features/classes/classes.api";
import { FormatBadge, StatusBadge, useFormatText, useResultText } from "../components/examMeta";
import { deleteExam, EXAM_FORMATS, listExams, type Exam, type ExamFormat } from "../examsSpring.api";

const PAGE_SIZE = 12;

export function ExamsPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const formatText = useFormatText();
  const resultText = useResultText();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<ExamFormat | "">("");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"mine" | "joined">("mine");
  const [deleting, setDeleting] = useState<Exam | null>(null);

  const classes = useQuery({ queryKey: ["classes", scope, "options"], queryFn: () => getClasses({ role: scope === "joined" ? "student" : "teacher", limit: 100 }) });
  const exams = useQuery({
    queryKey: ["exams", { search: search.trim(), format, classId, page, scope }],
    queryFn: () => listExams({ page, limit: PAGE_SIZE, search, format, class_id: classId, role: scope === "joined" ? "student" : undefined }),
    placeholderData: (prev) => prev,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteExam(id),
    onSuccess: () => { toast.success(t("exam.deleted", "Đã xóa kỳ thi")); setDeleting(null); void qc.invalidateQueries({ queryKey: ["exams"] }); },
    onError: (e) => { toast.error(getApiErrorMessage(e, t("exam.deleteFailed", "Không xóa được kỳ thi"))); setDeleting(null); },
  });

  const list = exams.data?.data ?? [];
  const total = exams.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fmt = (v: string | null) => (v ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : null);
  const filtered = Boolean(search.trim() || format || classId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t("exam.title", "Kỳ thi")}</h1>
          <p className="mt-1 text-muted-foreground">{t("exam.subtitle", "Tạo kỳ thi offline, online hoặc nộp bài bằng ảnh, sinh nhiều mã đề từ ngân hàng câu hỏi.")}</p>
        </div>
        {scope === "mine" && <Button asChild className="gap-2"><Link to="/exams/create"><Plus className="h-4 w-4" />{t("exam.new", "Tạo kỳ thi")}</Link></Button>}
      </div>

      <Segmented<"mine" | "joined"> label={t("exam.scope", "Phạm vi")} value={scope} onChange={(v) => { setScope(v); setClassId(""); setPage(1); }}
        options={[{ value: "mine", label: t("exam.scope.mine", "Tôi tạo") }, { value: "joined", label: t("exam.scope.joined", "Tôi tham gia") }]} />

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative md:max-w-sm md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t("exam.search", "Tìm theo tên kỳ thi")} aria-label={t("exam.search", "Tìm theo tên kỳ thi")} className="rounded-full pl-9" />
        </div>
        <Select value={format || "all"} onValueChange={(v) => { setFormat(v === "all" ? "" : (v as ExamFormat)); setPage(1); }}>
          <SelectTrigger className="rounded-full md:w-48" aria-label={t("exam.filter.format", "Loại kỳ thi")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("exam.filter.allFormats", "Mọi loại kỳ thi")}</SelectItem>
            {EXAM_FORMATS.map((f) => <SelectItem key={f} value={f}>{formatText(f).name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classId || "all"} onValueChange={(v) => { setClassId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="rounded-full md:w-56" aria-label={t("exam.filter.class", "Lớp")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("exam.filter.allClasses", "Mọi lớp")}</SelectItem>
            {(classes.data?.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {exams.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : exams.isError ? (
        <div role="alert" className="rounded-2xl border border-destructive/30 p-6 text-center text-sm text-destructive">
          {getApiErrorMessage(exams.error, t("exam.loadFailed", "Không tải được danh sách kỳ thi"))}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => void exams.refetch()}>{t("qb.retry", "Thử lại")}</Button>
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title={filtered ? t("exam.noMatch", "Không có kỳ thi nào khớp") : t("exam.empty", "Bạn chưa có kỳ thi nào")} hint={filtered ? undefined : t("exam.emptyHint", "Bấm “Tạo kỳ thi” để bắt đầu.")} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="exam-list">
            {list.map((e) => (
              <article key={e.id} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2"><FormatBadge format={e.format} /><StatusBadge status={e.status} /></div>
                <Link to={`/exams/${e.id}`} className="mt-3 line-clamp-2 text-lg font-semibold text-foreground hover:text-primary">{e.name}</Link>
                <p className="mt-1 text-sm text-muted-foreground">{[e.class_name, e.subject].filter(Boolean).join(" · ")}</p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {fmt(e.from_time) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("exam.field.from", "Bắt đầu")}</dt><dd>{fmt(e.from_time)}</dd></div>}
                  {e.my_role === "TEACHER" && <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{t("exam.versions", "Mã đề")}</dt><dd className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-muted-foreground" />{e.versions_count}{e.questions_per_version > 0 && <span className="text-muted-foreground"> · {e.questions_per_version} {t("exam.questionsShort", "câu")}</span>}</dd></div>}
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("exam.field.result", "Kết quả")}</dt><dd className="text-right">{resultText(e)}</dd></div>
                </dl>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <Button asChild variant="outline" size="sm"><Link to={`/exams/${e.id}`}>{t("exam.open", "Mở kỳ thi")}</Link></Button>
                  {e.status === "DRAFT" && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(e)} aria-label={t("exam.delete", "Xóa kỳ thi")}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("exam.prev", "Trước")}</Button>
              <span className="tabular-nums text-muted-foreground">{page} / {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("exam.next", "Sau")}</Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exam.deleteTitle", "Xóa kỳ thi này?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("exam.deleteDesc", "Kỳ thi “{{name}}” và các mã đề của nó sẽ bị xóa. Chỉ xóa được kỳ thi còn là bản nháp.", { name: deleting?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Hủy")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>{t("exam.delete", "Xóa kỳ thi")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
