import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { MessageSquare, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ListPagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { Exam } from "@/types/academic.types";
import { AppealReviewPanel, getStatusBadgeClass } from "@/features/appeals/components/AppealReviewPanel";
import { getAppeals, resolveAppeal, type Appeal } from "@/features/appeals/appeals.api";

interface ExamDetailContext {
  exam: Exam | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function ExamAppealsTab() {
  const { t } = useTranslation();
  const { exam, isLoading: isExamLoading } = useOutletContext<ExamDetailContext>();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  const selectedAppeal = useMemo(
    () => appeals.find((appeal) => appeal.id === selectedAppealId) ?? appeals[0] ?? null,
    [appeals, selectedAppealId],
  );

  const loadAppeals = useCallback(async () => {
    if (!exam?.id) return;
    try {
      setIsLoading(true);
      const response = await getAppeals({ exam_id: exam.id, page, limit });
      const examAppeals = response.data;
      setAppeals(examAppeals);
      setTotal(response.meta.total);
      setSelectedAppealId((current) => current ?? examAppeals[0]?.id ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("appeals.errors.loadList")));
    } finally {
      setIsLoading(false);
    }
  }, [exam?.id, limit, page, t]);

  useEffect(() => {
    if (!exam?.id) {
      setAppeals([]);
      setSelectedAppealId(null);
      return;
    }
    void loadAppeals();
  }, [exam?.id, loadAppeals]);

  useEffect(() => {
    setNote(selectedAppeal?.teacher_note ?? "");
  }, [selectedAppeal?.id]);

  function buildTeacherNote(decisionKey: "accepted" | "rejected") {
    const prefix = t(`appeals.teacherDecision.${decisionKey}`);
    const trimmedNote = note.trim();
    return trimmedNote ? `${prefix}\n${trimmedNote}` : prefix;
  }

  async function handleResolve(decisionKey: "accepted" | "rejected") {
    if (!selectedAppeal) return;
    try {
      setIsResolving(true);
      const updated = await resolveAppeal(selectedAppeal.id, {
        status: "REVIEWED",
        teacher_note: buildTeacherNote(decisionKey),
      });
      setAppeals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedAppealId(updated.id);
      toast.success(t(`appeals.actions.${decisionKey}`));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("appeals.errors.resolve")));
    } finally {
      setIsResolving(false);
    }
  }

  if (isExamLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 py-20 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-base font-medium text-muted-foreground">{t("appeals.loading")}</p>
      </div>
    );
  }

  if (appeals.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 py-20 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-base font-medium text-muted-foreground">{t("appeals.empty")}</p>
        <p className="text-sm text-muted-foreground/70">
          {t("appeals.emptyDesc", { examName: exam?.name ?? t("exams.defaultName") })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("appeals.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("appeals.subtitle", { examName: exam?.name ?? "-", count: total })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadAppeals()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {t("appeals.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-0 shadow-sm ring-1 ring-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("appeals.listTitle")}</CardTitle>
            <CardDescription>{t("appeals.listCount", { count: total })}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {isLoading && appeals.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("appeals.loadingList")}</div>
              )}
              {appeals.map((appeal) => (
                <button
                  key={appeal.id}
                  onClick={() => setSelectedAppealId(appeal.id)}
                  className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                    selectedAppeal?.id === appeal.id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{appeal.student.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {appeal.reason || t("appeals.noStudentMessage")}
                      </div>
                    </div>
                    <Badge className={getStatusBadgeClass(appeal.status)}>
                      {t(`appeals.status.${appeal.status.toLowerCase()}`, appeal.status)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-3 pb-3">
              <ListPagination page={page} limit={limit} total={total} isLoading={isLoading} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1); }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{t("appeals.detailTitle")}</CardTitle>
                <CardDescription>
                  {selectedAppeal
                    ? `${selectedAppeal.student.name} - ${selectedAppeal.exam.name}`
                    : t("appeals.selectPrompt")}
                </CardDescription>
              </div>
              {selectedAppeal && (
                <Badge className={getStatusBadgeClass(selectedAppeal.status)}>
                  {t(`appeals.status.${selectedAppeal.status.toLowerCase()}`, selectedAppeal.status)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedAppeal && (
              <div className="py-10 text-center text-sm text-muted-foreground">{t("appeals.noSelection")}</div>
            )}
            {selectedAppeal && (
              <AppealReviewPanel
                appeal={selectedAppeal}
                note={note}
                isResolving={isResolving}
                onNoteChange={setNote}
                onAccept={() => void handleResolve("accepted")}
                onReject={() => void handleResolve("rejected")}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
