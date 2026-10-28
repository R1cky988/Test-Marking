import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Lock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Settings,
  StopCircle,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { Exam, ExamStatus, ExamType, GradingType } from "@/types/academic.types";
import { deleteExam, exportAllExamPdfs, getExams, publishExam, updateExamStatus } from "../exams.api";
import { CreateExamMultiStep } from "./CreateExamMultiStep";

function statusBadge(status: ExamStatus, t: (key: string, options?: Record<string, unknown>) => string) {
  const config = {
    draft: "bg-muted text-foreground/80 hover:bg-muted",
    ready: "bg-brand-soft text-brand-soft-foreground hover:bg-brand-soft/80",
    scheduled: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    active: "bg-green-100 text-green-800 hover:bg-green-100",
    end: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    closed: "bg-red-100 text-red-800 hover:bg-red-100",
  } satisfies Record<ExamStatus, string>;
  return <Badge className={config[status]}>{t(`examStatus.${status}`)}</Badge>;
}

function examTypeLabel(type: ExamType, t: (key: string) => string) {
  return t(`exams.type.${type}`);
}

function gradingTypeBadge(type: GradingType, t: (key: string) => string) {
  const config: Record<GradingType, { label: string; className: string }> = {
    TEACHER_GRADING: { label: "exams.grading.teacher", className: "bg-sky-100 text-sky-700 hover:bg-sky-100" },
    STUDENT_SUBMISSION: { label: "exams.grading.student", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  };
  const cfg = config[type] ?? config.TEACHER_GRADING;
  return <Badge className={cfg.className}>{t(cfg.label)}</Badge>;
}

function getEffectiveExamStatus(exam: Exam): ExamStatus {
  if (exam.grading_type !== "STUDENT_SUBMISSION") return exam.status;
  if (exam.status !== "scheduled" && exam.status !== "active") return exam.status;
  if (!exam.start_time || !exam.end_time) return exam.status;

  const now = Date.now();
  const start = new Date(exam.start_time).getTime();
  const end = new Date(exam.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return exam.status;
  if (now >= end) return "end";
  if (now >= start) return "active";
  return "scheduled";
}

export function ExamsPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [showCreateCloseDialog, setShowCreateCloseDialog] = useState(false);
  const [createDraftExamId, setCreateDraftExamId] = useState<string | null>(null);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);
  const [examToPublish, setExamToPublish] = useState<Exam | null>(null);
  const [examToClose, setExamToClose] = useState<Exam | null>(null);
  const [examToEnd, setExamToEnd] = useState<Exam | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExamStatus | "all">("all");
  const [nameFilter, setNameFilter] = useState("");
  const [hideClosed, setHideClosed] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [expandedExamIds, setExpandedExamIds] = useState<string[]>([]);

  const loadExams = useCallback(async (options: { background?: boolean } = {}) => {
    try {
      if (!options.background) setIsLoading(true);
      const fetched: Exam[] = [];
      const requestLimit = 100;
      let requestPage = 1;
      let totalFromServer = 0;

      do {
        const response = await getExams({
          name: nameFilter || undefined,
          page: requestPage,
          limit: requestLimit,
        });
        fetched.push(...response.data);
        totalFromServer = response.meta.total;
        requestPage += 1;
      } while (fetched.length < totalFromServer);

      setExams(fetched);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.errors.list")));
    } finally {
      if (!options.background) setIsLoading(false);
    }
  }, [nameFilter, t]);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  useEffect(() => {
    const status = new URLSearchParams(location.search).get("status");
    const allowedStatuses: Array<ExamStatus | "all"> = ["all", "draft", "ready", "scheduled", "active", "end", "closed"];
    if (status && allowedStatuses.includes(status as ExamStatus | "all")) {
      setStatusFilter(status as ExamStatus | "all");
      if (status === "closed") setHideClosed(false);
    }
  }, [location.search]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadExams({ background: true });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadExams]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, nameFilter, hideClosed, limit]);

  const parentExams = exams.filter((exam) => !exam.parent_exam_id);

  const filteredExams = parentExams.filter((exam) => {
    const effectiveStatus = getEffectiveExamStatus(exam);
    if (hideClosed && effectiveStatus === "closed") return false;
    if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
    return true;
  });
  const total = filteredExams.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedExams = filteredExams.slice((page - 1) * limit, page * limit);
  const tableRows = paginatedExams.flatMap((exam) => {
    const rows = [{ exam, isInstance: false }];
    if ((exam.instances?.length ?? 0) > 1 && expandedExamIds.includes(exam.id)) {
      rows.push(...(exam.instances ?? []).map((instance) => ({ exam: instance, isInstance: true })));
    }
    return rows;
  });

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function toggleExamExpanded(examId: string) {
    setExpandedExamIds((current) =>
      current.includes(examId) ? current.filter((id) => id !== examId) : [...current, examId],
    );
  }

  function openCreateDialog() {
    setCreateDraftExamId(null);
    setOpenCreate(true);
  }

  function handleCreateOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      openCreateDialog();
      return;
    }
    setShowCreateCloseDialog(true);
  }

  async function discardCreateDraft() {
    try {
      setIsDiscardingDraft(true);
      if (createDraftExamId) {
        await deleteExam(createDraftExamId);
      }
      setShowCreateCloseDialog(false);
      setOpenCreate(false);
      setCreateDraftExamId(null);
      await loadExams();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.errors.deleteDraft", { defaultValue: "Không thể xóa kỳ thi đang tạo" })));
    } finally {
      setIsDiscardingDraft(false);
    }
  }

  async function keepCreateDraft() {
    setShowCreateCloseDialog(false);
    setOpenCreate(false);
    setCreateDraftExamId(null);
    await loadExams();
  }

  async function handlePublish(exam: Exam) {
    try {
      if (exam.status === "scheduled") {
        await updateExamStatus(exam.id, "ACTIVE");
      } else {
        await publishExam(exam.id);
      }
      toast.success(t("exams.actions.publishSuccess"));
      setExamToPublish(null);
      await loadExams();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.errors.publish")));
    }
  }

  async function handleClose(exam: Exam) {
    try {
      await updateExamStatus(exam.id, "CLOSED");
      toast.success(t("exams.actions.closeSuccess"));
      setExamToClose(null);
      await loadExams();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.errors.close")));
    }
  }

  async function handleEnd(exam: Exam) {
    try {
      await updateExamStatus(exam.id, "END");
      toast.success(t("exams.actions.endEarlySuccess"));
      setExamToEnd(null);
      await loadExams();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.errors.endEarly")));
    }
  }

  async function handleExportPackage(exam: Exam) {
    try {
      const result = await exportAllExamPdfs(exam.id, i18n.language);
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = result.filename || `${exam.name || "ky-thi"}-de-thi-pdf.zip`;
      link.click();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.errors.exportAll")));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t("exams.list.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("exams.list.subtitle")}</p>
        </div>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t("exams.list.create")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>{t('exams.list.title')}</CardTitle>
              <CardDescription>{t("exams.list.description")}</CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-[180px_220px_auto]">
              <div className="space-y-2">
                <Label>{t("exams.filters.status")}</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    const nextValue = value as ExamStatus | "all";
                    setStatusFilter(nextValue);
                    if (nextValue === "closed") {
                      setHideClosed(false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exams.filters.all")}</SelectItem>
                    <SelectItem value="draft">{t("examStatus.draft")}</SelectItem>
                    <SelectItem value="ready">{t("examStatus.ready")}</SelectItem>
                    <SelectItem value="scheduled">{t("examStatus.scheduled")}</SelectItem>
                    <SelectItem value="active">{t("examStatus.active")}</SelectItem>
                    <SelectItem value="end">{t("examStatus.end")}</SelectItem>
                    <SelectItem value="closed">{t("examStatus.closed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-filter">{t("exams.filters.name")}</Label>
                <Input
                  id="name-filter"
                  placeholder={t("exams.filters.namePlaceholder")}
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2 pb-1">
                  <Switch
                    checked={hideClosed}
                    onCheckedChange={(checked) => {
                      setHideClosed(checked);
                      if (checked && statusFilter === "closed") {
                        setStatusFilter("all");
                      }
                    }}
                  />
                  <Label className="text-sm">{t("exams.filters.hideClosed")}</Label>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => void loadExams()}>
                  <RefreshCw className="h-4 w-4" />
                  {t("exams.filters.refresh")}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 shrink-0" />
                    {t("exams.table.name")}
                  </div>
                </TableHead>
                <TableHead>{t("exams.table.subject")}</TableHead>
                <TableHead>{t("exams.table.examType")}</TableHead>
                <TableHead>{t("exams.table.grading")}</TableHead>
                <TableHead>{t("exams.table.identification")}</TableHead>
                <TableHead>{t("exams.table.duration")}</TableHead>
                <TableHead>{t('exams.meta', {totalQuestions: '', duration: '', subject: ''}).split('·')[1] || 'Questions'}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[190px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map(({ exam, isInstance }) => {
                const effectiveStatus = getEffectiveExamStatus(exam);
                const instanceCount = exam.instances?.length ?? 0;
                const isExpanded = expandedExamIds.includes(exam.id);
                const examName = isInstance ? exam.class?.class_name || exam.name : exam.name;
                const isOperationalExam = isInstance || (instanceCount === 0 && Boolean(exam.class_id));
                const canEditConfig = exam.status === "draft" || exam.status === "ready" || effectiveStatus === "scheduled";
                return (
                <TableRow key={exam.id} className={isInstance ? "bg-muted/20" : undefined}>
                  <TableCell className="font-medium">
                    <div className={`flex items-center gap-2 ${isInstance ? "pl-9 text-sm" : ""}`}>
                      {!isInstance && instanceCount > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => toggleExamExpanded(exam.id)}
                          aria-label={isExpanded ? "Thu gọn danh sách lớp" : "Mở danh sách lớp"}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <span className="h-7 w-7 shrink-0" />
                      )}
                      <Link
                        to={`/exams/${exam.id}/info`}
                        state={{ from: `${location.pathname}${location.search}` }}
                        className="min-w-0 cursor-pointer text-brand-soft-foreground hover:text-primary"
                      >
                        {examName}
                      </Link>
                      {!isInstance && instanceCount > 1 && (
                        <Badge variant="secondary" className="shrink-0">
                          {instanceCount} lớp
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{exam.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{examTypeLabel(exam.exam_type, t)}</Badge>
                  </TableCell>
                  <TableCell>{gradingTypeBadge(exam.grading_type, t)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`exams.identification.${exam.identification_mode}`)}</Badge>
                  </TableCell>
                  <TableCell>{t("exams.table.durationValue", { duration: exam.duration })}</TableCell>
                  <TableCell>{exam.total_questions}</TableCell>
                  <TableCell>{statusBadge(effectiveStatus, t)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!isInstance && !isOperationalExam && (
                        <>
                          {canEditConfig && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExamToPublish(exam)}
                              title={t("exams.actions.publish")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {exam.grading_type === "STUDENT_SUBMISSION" ? (
                            <>
                              {effectiveStatus === "active" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setExamToEnd(exam)}
                                  title={t("exams.actions.endEarly", { defaultValue: "Kết thúc kỳ thi" })}
                                >
                                  <StopCircle className="h-4 w-4 text-amber-600" />
                                </Button>
                              )}
                              {effectiveStatus === "end" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setExamToClose(exam)}
                                  title={t("exams.actions.close")}
                                >
                                  <Lock className="h-4 w-4 text-rose-600" />
                                </Button>
                              )}
                            </>
                          ) : (
                            effectiveStatus === "active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExamToClose(exam)}
                                title={t("exams.actions.close")}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            )
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleExportPackage(exam)}
                            title={t("exams.actions.exportAll")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canEditConfig && (
                          <Link to={`/exams/${exam.id}/edit`}>
                            <Button variant="ghost" size="icon" title={t("exams.actions.settings")}> 
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                          )}
                        </>
                      )}
                      {isOperationalExam && (
                        <>
                          {canEditConfig && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExamToPublish(exam)}
                              title={t("exams.actions.publish")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {exam.grading_type === "STUDENT_SUBMISSION" ? (
                            <>
                              {effectiveStatus === "active" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setExamToEnd(exam)}
                                  title={t("exams.actions.endEarly", { defaultValue: "Kết thúc kỳ thi" })}
                                >
                                  <StopCircle className="h-4 w-4 text-amber-600" />
                                </Button>
                              )}
                              {effectiveStatus === "end" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setExamToClose(exam)}
                                  title={t("exams.actions.close")}
                                >
                                  <Lock className="h-4 w-4 text-rose-600" />
                                </Button>
                              )}
                            </>
                          ) : (
                            effectiveStatus === "active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExamToClose(exam)}
                                title={t("exams.actions.close")}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            )
                          )}
                          <Link to={`/exams/${exam.id}/results`}>
                            <Button variant="ghost" size="icon" title={t("exams.actions.results")}> 
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          </Link>
                          {!isInstance && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleExportPackage(exam)}
                              title={t("exams.actions.exportAll")}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {!isInstance && canEditConfig && (
                            <Link to={`/exams/${exam.id}/edit`}>
                              <Button variant="ghost" size="icon" title={t("exams.actions.settings")}>
                                <Settings className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              {!isLoading && paginatedExams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {t("exams.empty")}
                  </TableCell>
                </TableRow>
              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {t("exams.loading")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>{t("exams.pagination.total", { total })}</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label>{t("exams.pagination.show")}</Label>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => setLimit(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {t("exams.pagination.page", { page, totalPages })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t("exams.pagination.prev")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("exams.pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-[100dvw] max-w-none flex-col overflow-hidden rounded-none p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
            <DialogTitle>{t("exams.list.create")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {openCreate && (
              <CreateExamMultiStep
                embedded
                onDraftExamChange={setCreateDraftExamId}
                onCompleted={() => {
                  setOpenCreate(false);
                  setCreateDraftExamId(null);
                  void loadExams();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateCloseDialog} onOpenChange={setShowCreateCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.createClose.title", { defaultValue: "Đóng màn tạo kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {createDraftExamId
                ? t("exams.createClose.descriptionWithDraft", {
                  defaultValue: "Kỳ thi đã có bản nháp. Bạn muốn xóa kỳ thi đang tạo hay lưu tạm thời để tiếp tục sau?",
                })
                : t("exams.createClose.descriptionWithoutDraft", {
                  defaultValue: "Kỳ thi chưa được lưu nháp. Nếu đóng bây giờ, các thông tin vừa nhập sẽ bị mất.",
                })}
            </p>
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t("exams.createClose.draftWarning", {
                  defaultValue: "Chú ý: kỳ thi chỉ được lưu nháp sau khi hoàn thành bước 2 bằng cách chọn mẫu phiếu và bấm Tiếp. Nếu chưa tới mốc này, hệ thống chưa tạo bản nháp để lưu lại.",
                })}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="destructive" onClick={() => void discardCreateDraft()} disabled={isDiscardingDraft}>
              {isDiscardingDraft
                ? t("exams.createClose.deleting", { defaultValue: "Đang xóa..." })
                : createDraftExamId
                  ? t("exams.createClose.delete", { defaultValue: "Xóa kỳ thi đang tạo" })
                  : t("exams.createClose.closeWithoutSaving", { defaultValue: "Đóng không lưu" })}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateCloseDialog(false)} disabled={isDiscardingDraft}>
                {t("common.cancel", { defaultValue: "Hủy" })}
              </Button>
              {createDraftExamId && (
                <Button type="button" variant="success" onClick={() => void keepCreateDraft()} disabled={isDiscardingDraft}>
                  {t("exams.createClose.keep", { defaultValue: "Lưu tạm thời" })}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(examToPublish)} onOpenChange={(open) => !open && setExamToPublish(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.publishConfirm.title", { defaultValue: "Mở kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("exams.publishConfirm.description", {
              defaultValue:
                "Sau khi mở kỳ thi, giáo viên không thể chỉnh sửa thông tin, template, câu hỏi hoặc mã đề. Kỳ thi phải được mở thì mới chấm và đồng bộ kết quả.",
            })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExamToPublish(null)}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button type="button" variant="success" onClick={() => examToPublish && void handlePublish(examToPublish)}>
              {t("exams.actions.publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(examToClose)} onOpenChange={(open) => !open && setExamToClose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.closeConfirm.title", { defaultValue: "Đóng kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("exams.closeConfirm.description", {
              name: examToClose?.name ?? "",
              defaultValue:
                "Sau khi đóng kỳ thi, hệ thống sẽ không nhận khiếu nại mới, không xử lý khiếu nại đang chờ và không cho chấm lại.",
            })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExamToClose(null)}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button type="button" variant="destructive" onClick={() => examToClose && void handleClose(examToClose)}>
              {t("exams.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(examToEnd)} onOpenChange={(open) => !open && setExamToEnd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("exams.endConfirm.title", { defaultValue: "Kết thúc kỳ thi?" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("exams.endConfirm.description", {
              name: examToEnd?.name ?? "",
              defaultValue:
                "Sau khi kết thúc kỳ thi, học sinh sẽ không thể làm bài hoặc nộp bài nữa. Kỳ thi sẽ được chuyển sang trạng thái Kết thúc.",
            })}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExamToEnd(null)}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Button>
            <Button type="button" variant="destructive" onClick={() => examToEnd && void handleEnd(examToEnd)}>
              {t("exams.actions.endEarly", { defaultValue: "Kết thúc" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
