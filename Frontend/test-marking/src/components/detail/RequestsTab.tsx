import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { approveJoinRequest, getJoinRequests, rejectJoinRequest, type JoinRequestStatus } from "@/features/classes/classDetail.api";
import { EmptyState, fmtDateTime, PersonAvatar } from "./shared";

const FILTERS: { value: JoinRequestStatus; label: string; fallback: string }[] = [
  { value: "PENDING", label: "classes.requests.pending", fallback: "Đang chờ" },
  { value: "APPROVED", label: "classes.requests.approved", fallback: "Đã duyệt" },
  { value: "REJECTED", label: "classes.requests.rejected", fallback: "Đã từ chối" },
];

export function RequestsTab({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<JoinRequestStatus>("PENDING");
  const query = useQuery({ queryKey: ["class-requests", classId, status], queryFn: () => getJoinRequests(classId, status) });

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ["class-requests", classId] });
    void queryClient.invalidateQueries({ queryKey: ["class-members", classId] });
    void queryClient.invalidateQueries({ queryKey: ["class-info", classId] });
  };
  const onError = (e: unknown) => {
    toast.error(getApiErrorMessage(e, t("classes.requests.failed", { defaultValue: "Không thể xử lý yêu cầu" })));
    done(); // e.g. REQUEST_NOT_PENDING: someone else already handled it, so refresh the list
  };
  const approve = useMutation({ mutationFn: (id: string) => approveJoinRequest(classId, id), onSuccess: done, onError });
  const reject = useMutation({ mutationFn: (id: string) => rejectJoinRequest(classId, id), onSuccess: done, onError });
  const busy = approve.isPending || reject.isPending;

  const STATUS_TINT: Record<JoinRequestStatus, string> = {
    PENDING: "bg-warning-soft text-warning-foreground",
    APPROVED: "bg-success-soft text-success-foreground",
    REJECTED: "bg-danger-soft text-danger-foreground",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="inline-flex gap-1 rounded-full bg-muted p-1" role="group" aria-label={t("classes.requests.filter", { defaultValue: "Lọc yêu cầu" })}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              status === f.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(f.label, { defaultValue: f.fallback })}
          </button>
        ))}
      </div>

      {query.isLoading && <Skeleton className="h-20 w-full rounded-2xl" />}
      {query.isError && <p className="text-sm text-destructive">{getApiErrorMessage(query.error, t("classes.requests.loadFailed", { defaultValue: "Không tải được yêu cầu" }))}</p>}
      {query.isSuccess && query.data.length === 0 && (
        <EmptyState
          icon={<Inbox />}
          title={t("classes.requests.empty", { defaultValue: "Không có yêu cầu nào" })}
          hint={status === "PENDING" ? t("classes.requests.emptyHint", { defaultValue: "Khi học sinh nhập mã lớp, yêu cầu sẽ hiện ở đây để bạn duyệt." }) : undefined}
        />
      )}

      <ul className="space-y-3">
        {query.data?.map((r) => (
          <li key={r.id}>
            <Card className="rounded-2xl">
              <CardContent className="flex flex-wrap items-start gap-4 p-4">
                <PersonAvatar person={{ name: r.student.name ?? "?", avatar_url: r.student.avatar_url ?? null }} className="h-11 w-11" />
                <div className="min-w-0 flex-1 basis-56 space-y-1.5">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {r.student.name}
                    {r.student.student_code && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{r.student.student_code}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.student.email} · {fmtDateTime(r.created_at, i18n.language === "en" ? "en-US" : "vi-VN")}
                  </p>
                  {r.message && <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm leading-6">“{r.message}”</p>}
                  {r.status === "REJECTED" && r.rejection_reason && <p className="text-sm text-muted-foreground">{r.rejection_reason}</p>}
                </div>
                {r.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={() => approve.mutate(r.id)}>
                      <Check className="mr-1 h-4 w-4" />
                      {t("classes.requests.approve", { defaultValue: "Duyệt" })}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => reject.mutate(r.id)}>
                      <X className="mr-1 h-4 w-4" />
                      {t("classes.requests.reject", { defaultValue: "Từ chối" })}
                    </Button>
                  </div>
                ) : (
                  <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_TINT[r.status])}>
                    {t(`classes.requests.${r.status.toLowerCase()}`, { defaultValue: r.status })}
                  </span>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
