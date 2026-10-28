import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getExamViolations, type ExamViolation } from "../exams.api";
import {
  getViolationBackendLabel,
  getViolationTeacherMessage,
  getViolationTranslationKey,
} from "../violationDisplay";

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExamViolationsTab() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const { id: examId } = useParams<{ id: string }>();
  const [violations, setViolations] = useState<ExamViolation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  async function loadViolations(options: { background?: boolean } = {}) {
    if (!examId) return;
    try {
      if (!options.background) setIsLoading(true);
      const response = await getExamViolations(examId, { page, limit });
      setViolations(response.data);
      setTotal(response.meta.total);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.violations.loadError")));
    } finally {
      if (!options.background) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadViolations();
  }, [examId, limit, page]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadViolations({ background: true });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [examId, limit, page]);

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            {t("exams.violations.title")}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("exams.violations.description")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void loadViolations()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {t("exams.violations.refresh")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && violations.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        ) : violations.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/70" />
            <div className="mt-3 font-medium text-foreground">
              {t("exams.violations.emptyTitle")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("exams.violations.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("exams.violations.columns.student")}</TableHead>
                  <TableHead>{t("exams.violations.columns.class")}</TableHead>
                  <TableHead>{t("exams.violations.columns.violation")}</TableHead>
                  <TableHead>{t("exams.violations.columns.time")}</TableHead>
                  <TableHead>{t("exams.violations.columns.sessionStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((violation) => {
                  const translationKey = getViolationTranslationKey(violation.violation_type);
                  const label =
                    getViolationBackendLabel(violation) ??
                    (translationKey ? t(translationKey) : violation.violation_type);
                  const teacherMessage = getViolationTeacherMessage(violation);
                  const sessionStatus = violation.session_status?.toLowerCase();

                  return (
                    <TableRow key={violation.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {violation.student.name || violation.student.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {violation.student.code
                            ? t("exams.violations.studentCode", { code: violation.student.code })
                            : violation.student.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{violation.class?.name ?? "-"}</div>
                        {violation.class?.code ? (
                          <div className="text-xs text-muted-foreground">{violation.class.code}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-800">
                          {label}
                        </Badge>
                        {teacherMessage ? (
                          <div className="mt-1 max-w-[360px] text-xs leading-relaxed text-muted-foreground">
                            {teacherMessage}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDate(violation.occurred_at ?? violation.created_at, locale)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sessionStatus
                            ? t(`exams.violations.status.${sessionStatus}`, {
                                defaultValue: violation.session_status ?? "-",
                              })
                            : "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-3">
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
  );
}
