import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Pencil, Printer, Rocket, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { AnalysisPanel } from "../components/AnalysisPanel";
import { FormatBadge, StatusBadge, useResultText } from "../components/examMeta";
import { ParticipantsPanel, type ParticipantFilter } from "../components/ParticipantsPanel";
import { RecordResultDialog } from "../components/RecordResultDialog";
import { ResultDialog } from "../components/ResultDialog";
import { ResultsPanel } from "../components/ResultsPanel";
import { StatsPanel } from "../components/StatsPanel";
import { StudentExamView } from "../components/StudentExamView";
import { VersionsPanel } from "../components/VersionsPanel";
import { ViolationsPanel } from "../components/ViolationsPanel";
import { deleteExam, getExam, getExamStats, getVersions, publishExam, setResultsPublished } from "../examsSpring.api";

const TABS = ["stats", "participants", "results", "analysis", "violations", "versions"] as const;
type Tab = (typeof TABS)[number];

/**
 * Teacher: statistics, participants (= the whole class), papers, per-question analysis, violations, versions.
 * Student: name, state, times, score spread and his own paper (once released) - none of the teacher tabs.
 */
export function ExamDetailPage() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const resultText = useResultText();
  const [params, setParams] = useSearchParams();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<ParticipantFilter>("all");
  const [openResult, setOpenResult] = useState<string | null>(null);
  const [recording, setRecording] = useState<{ open: boolean; student?: string }>({ open: false });
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";

  const exam = useQuery({ queryKey: ["exam", id], queryFn: () => getExam(id) });
  const teacher = exam.data?.my_role === "TEACHER";
  const versions = useQuery({ queryKey: ["exam", id, "versions"], queryFn: () => getVersions(id), enabled: teacher });
  const stats = useQuery({ queryKey: ["exam", id, "stats"], queryFn: () => getExamStats(id), enabled: teacher && exam.data?.status !== "DRAFT" });

  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : exam.data?.status === "DRAFT" ? "versions" : "stats";
  const goTab = (next: string) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", next); return n; }, { replace: true });

  const refresh = () => { void qc.invalidateQueries({ queryKey: ["exam", id] }); void qc.invalidateQueries({ queryKey: ["exams"] }); };
  const publish = useMutation({
    mutationFn: () => publishExam(id),
    onSuccess: () => { toast.success(t("exam.published", "Đã công bố kỳ thi")); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.publishFailed", "Không công bố được kỳ thi"))),
  });
  const release = useMutation({
    mutationFn: (on: boolean) => setResultsPublished(id, on),
    onSuccess: (e) => { toast.success(e.is_score_published ? t("exam.results.releasedOk", "Đã công bố kết quả cho học sinh") : t("exam.results.hiddenOk", "Đã ẩn kết quả với học sinh")); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e, t("exam.results.releaseFailed", "Không cập nhật được việc công bố kết quả"))),
  });
  const remove = useMutation({
    mutationFn: () => deleteExam(id),
    onSuccess: () => { toast.success(t("exam.deleted", "Đã xóa kỳ thi")); void qc.invalidateQueries({ queryKey: ["exams"] }); navigate("/exams"); },
    onError: (e) => { toast.error(getApiErrorMessage(e, t("exam.deleteFailed", "Không xóa được kỳ thi"))); setConfirmDelete(false); },
  });

  if (exam.isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (exam.isError || !exam.data) {
    return <div role="alert" className="rounded-2xl border border-destructive/30 p-6 text-center text-sm text-destructive">{getApiErrorMessage(exam.error, t("exam.loadOneFailed", "Không tải được kỳ thi"))}</div>;
  }
  const e = exam.data;
  const draft = e.status === "DRAFT";
  const fmt = (v: string | null) => (v ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "—");
  const info: Array<[string, string]> = [
    [t("exam.field.class", "Lớp tham gia"), e.class_name ?? "—"],
    [t("exam.field.subject", "Môn học"), e.subject ?? "—"],
    [t("exam.field.from", "Bắt đầu"), fmt(e.from_time)],
    [t("exam.field.to", "Kết thúc"), fmt(e.to_time)],
    ...(teacher ? [
      [t("exam.field.duration", "Thời lượng (phút)"), e.duration_minutes ? String(e.duration_minutes) : "—"] as [string, string],
      [t("exam.field.result", "Kết quả"), resultText(e)] as [string, string],
      [t("exam.step.template", "Mẫu phiếu"), e.template_name ? `${e.template_name} (${e.template_total_questions ?? 0} ${t("exam.questionsShort", "câu")})` : "—"] as [string, string],
      [t("exam.field.bank", "Ngân hàng câu hỏi"), e.question_bank_name ?? "—"] as [string, string],
    ] : []),
  ];
  const canRelease = teacher && !draft && e.result_policy !== "IMMEDIATE";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/exams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("exam.title", "Kỳ thi")}</Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{e.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2"><FormatBadge format={e.format} /><StatusBadge status={e.status} /></div>
          </div>
          {teacher && (
            <div className="flex flex-wrap gap-2">
              {e.format === "OFFLINE" && (
                <Button asChild variant="outline" className="gap-2" disabled={(versions.data ?? []).length === 0}>
                  <Link to={`/exams/${e.id}/print`}><Printer className="h-4 w-4" />{t("exam.printA4", "Xuất mã đề A4")}</Link>
                </Button>
              )}
              {draft && <Button asChild variant="outline" className="gap-2"><Link to={`/exams/${e.id}/edit`}><Pencil className="h-4 w-4" />{t("exam.edit", "Sửa kỳ thi")}</Link></Button>}
              {draft && <Button className="gap-2" disabled={(versions.data ?? []).length === 0 || publish.isPending} onClick={() => publish.mutate()}><Rocket className="h-4 w-4" />{t("exam.publish", "Công bố kỳ thi")}</Button>}
              {draft && <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(true)} aria-label={t("exam.delete", "Xóa kỳ thi")} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
            </div>
          )}
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5" aria-label={t("exam.info", "Thông tin")}>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {info.map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
        </dl>
      </section>

      {!teacher ? <StudentExamView exam={e} /> : (
        <>
          {canRelease && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
              <p className="text-sm">{e.is_score_published ? t("exam.results.releasedNote", "Học sinh đang xem được kết quả.") : t("exam.results.hiddenNote", "Học sinh chưa xem được kết quả. Bấm công bố khi đã chấm xong.")}</p>
              <Button type="button" size="sm" variant={e.is_score_published ? "outline" : "default"} className="gap-2" disabled={release.isPending} onClick={() => release.mutate(!e.is_score_published)}>
                {e.is_score_published ? <><EyeOff className="h-4 w-4" />{t("exam.results.hide", "Ẩn kết quả")}</> : <><Eye className="h-4 w-4" />{t("exam.results.publish", "Công bố kết quả")}</>}
              </Button>
            </div>
          )}
          <Tabs value={tab} onValueChange={goTab}>
            <TabsList className="h-auto flex-wrap justify-start">
              {!draft && <TabsTrigger value="stats">{t("exam.tab.stats", "Thống kê")}</TabsTrigger>}
              {!draft && <TabsTrigger value="participants">{t("exam.tab.participants", "Thí sinh")}</TabsTrigger>}
              {!draft && <TabsTrigger value="results">{t("exam.tab.results", "Chi tiết bài thi")}</TabsTrigger>}
              {!draft && <TabsTrigger value="analysis">{t("exam.tab.analysis", "Phân tích câu hỏi")}</TabsTrigger>}
              {!draft && <TabsTrigger value="violations">{t("exam.tab.violations", "Vi phạm")}</TabsTrigger>}
              <TabsTrigger value="versions">{t("exam.versions", "Mã đề")}</TabsTrigger>
            </TabsList>
            <div className="pt-5">
              <TabsContent value="stats">
                {stats.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : stats.data && (
                  <StatsPanel stats={stats.data} format={e.format} teacher onShowSubmitted={e.format === "OFFLINE" ? undefined : () => { setFilter("submitted"); goTab("participants"); }} />
                )}
              </TabsContent>
              <TabsContent value="participants"><ParticipantsPanel examId={e.id} filter={filter} onFilter={setFilter} showSubmit={e.format !== "OFFLINE"} onOpen={(p) => (p.result_id ? setOpenResult(p.result_id) : setRecording({ open: true, student: p.student_id }))} /></TabsContent>
              <TabsContent value="results"><ResultsPanel exam={e} onOpen={(r) => setOpenResult(r.id)} onRecord={() => setRecording({ open: true })} /></TabsContent>
              <TabsContent value="analysis"><AnalysisPanel examId={e.id} /></TabsContent>
              <TabsContent value="violations"><ViolationsPanel examId={e.id} onOpen={(r) => setOpenResult(r.id)} /></TabsContent>
              <TabsContent value="versions"><VersionsPanel exam={e} /></TabsContent>
            </div>
          </Tabs>
          <ResultDialog examId={e.id} resultId={openResult} open={openResult !== null} onOpenChange={(o) => { if (!o) setOpenResult(null); }} teacher />
          <RecordResultDialog examId={e.id} open={recording.open} studentId={recording.student} onOpenChange={(o) => setRecording((r) => ({ ...r, open: o }))} />
        </>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("exam.deleteTitle", "Xóa kỳ thi này?")}</AlertDialogTitle><AlertDialogDescription>{t("exam.deleteDesc", "Kỳ thi “{{name}}” và các mã đề của nó sẽ bị xóa. Chỉ xóa được kỳ thi còn là bản nháp.", { name: e.name })}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel", "Hủy")}</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()}>{t("exam.delete", "Xóa kỳ thi")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
