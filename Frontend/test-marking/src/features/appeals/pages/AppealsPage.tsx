import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, MessageSquareWarning, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ListPagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoBack } from "@/hooks/useGoBack";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { AppealReviewPanel, getStatusBadgeClass } from "../components/AppealReviewPanel";
import { getAppeal, getAppeals, resolveAppeal, type Appeal } from "../appeals.api";

function formatDate(value?: string | null, locale = "vi-VN") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

export function AppealsPage() {
  const { t, i18n } = useTranslation();
  const { appealId } = useParams();
  const goBack = useGoBack("/appeals");
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
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

  async function loadAppeals() {
    try {
      setIsLoading(true);
      const response = await getAppeals({ page, limit });
      let nextAppeals = response.data;
      if (appealId && !nextAppeals.some((appeal) => appeal.id === appealId)) {
        const detail = await getAppeal(appealId);
        nextAppeals = [detail, ...nextAppeals];
      }
      setAppeals(nextAppeals);
      setTotal(response.meta.total);
      setSelectedAppealId((current) => appealId ?? current ?? nextAppeals[0]?.id ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("appeals.errors.loadList")));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAppeals();
  }, [appealId, limit, page]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={goBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
          <h1 className="text-3xl font-semibold text-foreground">{t("appeals.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("appeals.pageSubtitle")}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadAppeals()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {t("appeals.refresh")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("appeals.listTitle")}</CardTitle>
            <CardDescription>{t("appeals.listCount", { count: total })}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && appeals.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("appeals.loading")}</div>
            )}
            {!isLoading && appeals.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex max-w-[260px] flex-col items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted dark:bg-white/[0.05]">
                    <MessageSquareWarning className="h-5 w-5 text-muted-foreground dark:text-zinc-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground dark:text-zinc-100">{t("appeals.emptyState.title")}</div>
                    <div className="text-sm leading-5 text-muted-foreground dark:text-zinc-400">{t("appeals.emptyState.description")}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="divide-y">
              {appeals.map((appeal) => (
                <button
                  key={appeal.id}
                  onClick={() => setSelectedAppealId(appeal.id)}
                  className={`w-full p-4 text-left transition-colors hover:bg-muted/40 ${
                    selectedAppeal?.id === appeal.id ? "bg-brand-soft" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{appeal.student.name}</div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">{appeal.exam.name}</div>
                    </div>
                    <Badge className={getStatusBadgeClass(appeal.status)}>
                      {t(`appeals.status.${appeal.status.toLowerCase()}`, appeal.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {appeal.reason || t("appeals.noStudentMessage")}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{formatDate(appeal.created_at, locale)}</div>
                </button>
              ))}
            </div>
            <div className="px-3 pb-3">
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
                hideItemCount={true}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{t("appeals.detailTitle")}</CardTitle>
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
              <div className="py-12 text-center text-sm text-muted-foreground">{t("appeals.noSelection")}</div>
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
