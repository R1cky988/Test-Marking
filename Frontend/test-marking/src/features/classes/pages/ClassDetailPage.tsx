import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, BookOpen, Check, GraduationCap, ClipboardList, Copy, FolderOpen, Newspaper, RefreshCw, UserPlus, Users, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { getClassInfo, regenerateJoinCode } from "../classDetail.api";
import { ExamsTab } from "@/components/detail/ExamsTab";
import { FilesTab } from "@/components/detail/FilesTab";
import { MembersTab } from "@/components/detail/MembersTab";
import { PostsTab } from "@/components/detail/PostsTab";
import { CountPill } from "@/components/detail/shared";
import { RequestsTab } from "@/components/detail/RequestsTab";

const TABS = ["posts", "exams", "files", "members", "requests"] as const;
type TabKey = (typeof TABS)[number];

/**
 * Class detail in the Examxy layout: Stream (posts) · Exams · Files · Members · Join requests (teacher only).
 * Teacher / student is decided by the server (`is_teacher`), never by the client.
 */
export function ClassDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  const info = useQuery({ queryKey: ["class-info", id], queryFn: () => getClassInfo(id), enabled: !!id });
  const regenerate = useMutation({
    mutationFn: () => regenerateJoinCode(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["class-info", id] }),
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.detail.regenFailed", { defaultValue: "Không thể tạo mã mới" }))),
  });

  if (info.isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  if (info.isError || !info.data) {
    return (
      <div className="p-6">
        <p className="text-destructive">{getApiErrorMessage(info.error, t("classes.detail.loadFailed", { defaultValue: "Không tải được lớp học" }))}</p>
        <Button asChild variant="link"><Link to="/classes">{t("classes.detail.back", { defaultValue: "Về danh sách lớp" })}</Link></Button>
      </div>
    );
  }

  const cls = info.data;
  const isTeacher = cls.is_teacher;
  const requested = params.get("tab") as TabKey | null;
  const tab: TabKey = requested && TABS.includes(requested) && (requested !== "requests" || isTeacher) ? requested : "posts";
  const pending = cls.pending_request_count ?? 0;

  const copyCode = async () => {
    if (!cls.join_code) return;
    try {
      await navigator.clipboard.writeText(cls.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("classes.detail.copyFailed", { defaultValue: "Không sao chép được" }));
    }
  };

  const tabClass =
    "h-9 flex-none gap-1.5 rounded-xl border-0 px-3.5 text-sm font-medium text-muted-foreground shadow-none transition-colors " +
    "hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm " +
    "dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
        <Link to="/classes"><ArrowLeft className="mr-1 h-4 w-4" />{t("classes.detail.back", { defaultValue: "Lớp học" })}</Link>
      </Button>

      {/* Cover: gradient from the theme's primary colour + soft decorative circles (pure CSS, no image) */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground shadow-sm md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/5" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {cls.subject && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <BookOpen className="h-3.5 w-3.5" />{cls.subject}
                </span>
              )}
              {cls.class_code && (
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 font-mono text-xs font-medium backdrop-blur-sm">{cls.class_code}</span>
              )}
              {cls.status === "archived" && (
                <Badge variant="secondary">{t("classes.detail.archived", { defaultValue: "Đã lưu trữ" })}</Badge>
              )}
            </div>

            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{cls.class_name}</h1>

            {cls.description && <p className="max-w-xl text-sm leading-6 opacity-90">{cls.description}</p>}

            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
              {cls.teacher?.name && (
                <span className="flex items-center gap-2 rounded-full bg-white/15 py-1 pl-1 pr-3.5 backdrop-blur-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary" aria-hidden>
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  {cls.teacher.name}
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-sm">
                <Users className="h-4 w-4" />
                {cls.student_count} {t("classes.detail.students", { defaultValue: "học sinh" })}
              </span>
            </div>
          </div>

          {isTeacher && cls.join_code && (
            <div className="rounded-2xl bg-white/15 p-4 ring-1 ring-white/25 backdrop-blur-md">
              <p className="text-xs font-medium opacity-90">{t("classes.detail.joinCode", { defaultValue: "Mã lớp" })}</p>
              <div className="mt-1 flex items-center gap-1">
                <p className="mr-2 font-mono text-2xl font-semibold tracking-[0.25em]">{cls.join_code}</p>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-current hover:bg-white/20 hover:text-current" onClick={copyCode} aria-label={t("classes.detail.copy", { defaultValue: "Sao chép mã" })}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-current hover:bg-white/20 hover:text-current" disabled={regenerate.isPending} onClick={() => regenerate.mutate()}
                  aria-label={t("classes.detail.regenerate", { defaultValue: "Tạo mã mới" })}>
                  <RefreshCw className={cn("h-4 w-4", regenerate.isPending && "animate-spin")} />
                </Button>
              </div>
              <p className="mt-1 h-4 text-xs opacity-90" aria-live="polite">{copied ? t("classes.detail.copied", { defaultValue: "Đã chép" }) : ""}</p>
            </div>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="gap-6">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1.5">
          <TabsTrigger className={tabClass} value="posts"><Newspaper />{t("classes.tabs.posts", { defaultValue: "Bảng tin" })}</TabsTrigger>
          <TabsTrigger className={tabClass} value="exams"><ClipboardList />{t("classes.tabs.exams", { defaultValue: "Bài thi" })}</TabsTrigger>
          <TabsTrigger className={tabClass} value="files"><FolderOpen />{t("classes.tabs.files", { defaultValue: "Tệp" })}</TabsTrigger>
          <TabsTrigger className={tabClass} value="members"><Users />{t("classes.tabs.members", { defaultValue: "Thành viên" })}<CountPill>{cls.student_count}</CountPill></TabsTrigger>
          {isTeacher && (
            <TabsTrigger className={tabClass} value="requests">
              <UserPlus />
              {t("classes.tabs.requests", { defaultValue: "Yêu cầu tham gia" })}
              {pending > 0 && <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">{pending}</Badge>}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts"><PostsTab classId={id} isTeacher={isTeacher} /></TabsContent>
        <TabsContent value="exams"><ExamsTab classId={id} isTeacher={isTeacher} /></TabsContent>
        <TabsContent value="files"><FilesTab classId={id} isTeacher={isTeacher} /></TabsContent>
        <TabsContent value="members"><MembersTab classId={id} isTeacher={isTeacher} /></TabsContent>
        {isTeacher && <TabsContent value="requests"><RequestsTab classId={id} /></TabsContent>}
      </Tabs>
    </div>
  );
}
