import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { CheckCircle2, CircleDashed, Clock, RefreshCw, TimerOff, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/ListPagination";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { Exam } from "@/types/academic.types";
import { getExamParticipants, type ExamParticipant, type ExamParticipantStatus } from "../exams.api";

const statusConfig: Record<ExamParticipantStatus, { labelKey: string; className: string }> = {
  not_started: { labelKey: "exams.participants.status.not_started", className: "bg-muted text-muted-foreground" },
  in_progress: { labelKey: "exams.participants.status.in_progress", className: "bg-blue-50 text-blue-700" },
  submitted: { labelKey: "exams.participants.status.submitted", className: "bg-emerald-50 text-emerald-700" },
  violated: { labelKey: "exams.participants.status.violated", className: "bg-rose-50 text-rose-700" },
  timeout: { labelKey: "exams.participants.status.timeout", className: "bg-amber-50 text-amber-700" },
  graded: { labelKey: "exams.participants.status.graded", className: "bg-emerald-50 text-emerald-700" },
  ungraded: { labelKey: "exams.participants.status.ungraded", className: "bg-amber-50 text-amber-700" },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString(i18n.language === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExamParticipantsTab() {
  const { t } = useTranslation();
  const { id: examId } = useParams<{ id: string }>();
  const { exam } = useOutletContext<{ exam: Exam | null }>();
  const isTeacherGrading = exam?.grading_type === "TEACHER_GRADING";
  const [participants, setParticipants] = useState<ExamParticipant[]>([]);
  const [summary, setSummary] = useState<Record<ExamParticipantStatus | "total", number>>({
    total: 0,
    not_started: 0,
    in_progress: 0,
    submitted: 0,
    violated: 0,
    timeout: 0,
    graded: 0,
    ungraded: 0,
  });
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "in_progress" | "submitted" | "attention" | "graded" | "ungraded">("all");

  useEffect(() => {
    setStatusFilter("all");
    setPage(1);
  }, [isTeacherGrading]);

  async function loadParticipants(options: { background?: boolean } = {}) {
    if (!examId) return;
    try {
      if (!options.background) setIsLoading(true);
      const response = await getExamParticipants(examId, { page, limit, status: statusFilter });
      setParticipants(response.data);
      setSummary(response.summary);
      setTotal(response.meta.total);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("exams.participants.loadError")));
    } finally {
      if (!options.background) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadParticipants();
  }, [examId, limit, page, statusFilter]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadParticipants({ background: true });
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [examId, limit, page, statusFilter]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return participants;
    return participants.filter((item) =>
      [
        item.student.name,
        item.student.email,
        item.student.internal_id,
        item.student.student_code,
        item.class.name,
        item.class.code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [participants, query]);

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${isTeacherGrading ? "md:grid-cols-3" : "md:grid-cols-5"}`}>
        <button type="button" className="text-left" onClick={() => { setStatusFilter("all"); setPage(1); }}>
          <Card className={`rounded-lg transition-colors ${statusFilter === "all" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-semibold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">{t("exams.participants.totalStudents")}</div>
            </div>
          </CardContent>
          </Card>
        </button>
        {isTeacherGrading ? (
          <>
            <button type="button" className="text-left" onClick={() => { setStatusFilter("graded"); setPage(1); }}>
              <Card className={`rounded-lg transition-colors ${statusFilter === "graded" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-2xl font-semibold">{summary.graded}</div>
                    <div className="text-xs text-muted-foreground">{t("exams.participants.status.graded")}</div>
                  </div>
                </CardContent>
              </Card>
            </button>
            <button type="button" className="text-left" onClick={() => { setStatusFilter("ungraded"); setPage(1); }}>
              <Card className={`rounded-lg transition-colors ${statusFilter === "ungraded" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <CircleDashed className="h-5 w-5 text-amber-600" />
                  <div>
                    <div className="text-2xl font-semibold">{summary.ungraded}</div>
                    <div className="text-xs text-muted-foreground">{t("exams.participants.status.ungraded")}</div>
                  </div>
                </CardContent>
              </Card>
            </button>
          </>
        ) : (
          <>
        <button type="button" className="text-left" onClick={() => { setStatusFilter("not_started"); setPage(1); }}>
        <Card className={`rounded-lg transition-colors ${statusFilter === "not_started" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <UserRound className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-semibold">{summary.not_started}</div>
              <div className="text-xs text-muted-foreground">{t("exams.participants.status.not_started")}</div>
            </div>
          </CardContent>
        </Card>
        </button>
        <button type="button" className="text-left" onClick={() => { setStatusFilter("in_progress"); setPage(1); }}>
        <Card className={`rounded-lg transition-colors ${statusFilter === "in_progress" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-2xl font-semibold">{summary.in_progress}</div>
              <div className="text-xs text-muted-foreground">{t("exams.participants.status.in_progress")}</div>
            </div>
          </CardContent>
        </Card>
        </button>
        <button type="button" className="text-left" onClick={() => { setStatusFilter("submitted"); setPage(1); }}>
        <Card className={`rounded-lg transition-colors ${statusFilter === "submitted" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-2xl font-semibold">{summary.submitted}</div>
              <div className="text-xs text-muted-foreground">{t("exams.participants.status.submitted")}</div>
            </div>
          </CardContent>
        </Card>
        </button>
        <button type="button" className="text-left" onClick={() => { setStatusFilter("attention"); setPage(1); }}>
        <Card className={`rounded-lg transition-colors ${statusFilter === "attention" ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <TimerOff className="h-5 w-5 text-rose-600" />
            <div>
              <div className="text-2xl font-semibold">{summary.violated + summary.timeout}</div>
              <div className="text-xs text-muted-foreground">{t("exams.participants.status.attention")}</div>
            </div>
          </CardContent>
        </Card>
        </button>
          </>
        )}
      </div>

      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {isTeacherGrading ? t("exams.participants.progressTeacher") : t("exams.participants.progressStudent")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTeacherGrading
                ? t("exams.participants.descTeacher")
                : t("exams.participants.descStudent")}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void loadParticipants()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("exams.participants.refresh")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("exams.participants.searchPlaceholder")}
            className="max-w-md"
          />
          {isLoading && participants.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("exams.participants.columns.student")}</TableHead>
                    <TableHead>{t("exams.participants.columns.class")}</TableHead>
                    <TableHead>{t("exams.participants.columns.status")}</TableHead>
                    {isTeacherGrading ? (
                      <TableHead>{t("exams.participants.columns.gradedAt")}</TableHead>
                    ) : (
                      <>
                        <TableHead>{t("exams.participants.columns.startedAt")}</TableHead>
                        <TableHead>{t("exams.participants.columns.submittedAt")}</TableHead>
                      </>
                    )}
                    <TableHead>{t("exams.participants.columns.score")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const cfg = statusConfig[item.status];
                    return (
                      <TableRow key={`${item.class.id}:${item.student.id}`}>
                        <TableCell>
                          <div className="font-medium text-foreground">{item.student.name || item.student.email}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.student.internal_id 
                              ? t("exams.participants.columns.internalId", { id: item.student.internal_id }) 
                              : t("exams.participants.columns.studentCode", { code: item.student.student_code ?? "-" })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{item.class.name}</div>
                          {item.class.code ? <div className="text-xs text-muted-foreground">{item.class.code}</div> : null}
                        </TableCell>
                        <TableCell>
                          <Badge className={cfg.className}>{t(cfg.labelKey)}</Badge>
                        </TableCell>
                        {isTeacherGrading ? (
                          <TableCell>{formatDate(item.submission?.graded_at)}</TableCell>
                        ) : (
                          <>
                            <TableCell>{formatDate(item.session?.start_time)}</TableCell>
                            <TableCell>{formatDate(item.submission?.submitted_at)}</TableCell>
                          </>
                        )}
                        <TableCell>{item.submission?.total_score ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.submission?.sheet_id ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/exams/${examId}/results/${item.submission.sheet_id}`}>{t("exams.participants.viewSheet")}</Link>
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isTeacherGrading ? 6 : 7} className="h-24 text-center text-muted-foreground">
                        {t("exams.participants.empty")}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
          <ListPagination page={page} limit={limit} total={total} isLoading={isLoading} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
}
