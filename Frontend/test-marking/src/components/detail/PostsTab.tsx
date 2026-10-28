import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, EyeOff, FileText, Megaphone, MessageSquare, Newspaper, Paperclip, Pin, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import {
  addComment, createPost, deleteComment, deletePost, downloadFile, formatFileSize, getPosts,
  setCommentHidden, updatePost, uploadFile, type ClassPostItem, type PostComment,
} from "@/features/classes/classDetail.api";
import { ReactionBar } from "../ReactionBar";
import { EmptyState, fmtDateTime, PersonAvatar } from "./shared";

export const POSTS_KEY = (classId: string) => ["class-posts", classId] as const;

export function PostsTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: POSTS_KEY(classId), queryFn: () => getPosts(classId) });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* every member of the class may post; only its teacher may announce, pin or close comments */}
      <PostComposer classId={classId} isTeacher={isTeacher} />
      {query.isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}
      {query.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(query.error, t("classes.posts.loadFailed", { defaultValue: "Không tải được bảng tin" }))}</p>
      )}
      {query.isSuccess && query.data.length === 0 && (
        <EmptyState
          icon={<Newspaper />}
          title={t("classes.posts.empty", { defaultValue: "Chưa có bài đăng nào" })}
          hint={isTeacher
            ? t("classes.posts.emptyHint", { defaultValue: "Đăng thông báo hoặc bài tập đầu tiên để cả lớp cùng xem." })
            : t("classes.posts.emptyHintStudent", { defaultValue: "Hãy là người đầu tiên chia sẻ điều gì đó với lớp." })}
        />
      )}
      {query.data?.map((p) => <PostCard key={p.id} classId={classId} post={p} />)}
    </div>
  );
}

// ─── composer (every member; announcements are teacher-only, the server enforces it too) ────────

function PostComposer({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [announcement, setAnnouncement] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const picker = useRef<HTMLInputElement>(null);

  const publish = useMutation({
    mutationFn: async () => {
      const post = await createPost(classId, { content: content.trim(), type: isTeacher && announcement ? "ANNOUNCEMENT" : "POST", status: "PUBLISHED" });
      const failed: string[] = [];
      for (const f of files) {
        try { await uploadFile(classId, f, { postId: post.id }); } catch { failed.push(f.name); }
      }
      return failed;
    },
    onSuccess: (failed) => {
      setContent(""); setFiles([]); setAnnouncement(false);
      if (failed.length) toast.error(`${t("classes.posts.attachFailed", { defaultValue: "Không đính kèm được" })}: ${failed.join(", ")}`);
      void queryClient.invalidateQueries({ queryKey: POSTS_KEY(classId) });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("classes.posts.createFailed", { defaultValue: "Không thể đăng bài" }))),
  });

  const me = useAuthStore((state) => state.user);
  const placeholder = isTeacher
    ? t("classes.posts.placeholder", { defaultValue: "Thông báo điều gì đó cho lớp..." })
    : t("classes.posts.placeholderStudent", { defaultValue: "Chia sẻ điều gì đó với lớp..." });

  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <PersonAvatar person={{ name: me?.fullName ?? "?", avatar_url: me?.avatarUrl ?? null }} />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={10000}
            rows={3}
            className="min-h-20 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder={placeholder}
            aria-label={placeholder}
          />
        </div>
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border bg-muted/40 py-1 pl-2.5 pr-1 text-sm">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-48 truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">({formatFileSize(f.size)})</span>
                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`${t("common.remove", { defaultValue: "Bỏ" })} ${f.name}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={picker} type="file" multiple className="hidden" data-testid="post-file-input"
              onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
            <Button type="button" size="sm" variant="ghost" onClick={() => picker.current?.click()}>
              <Paperclip className="mr-1 h-4 w-4" /> {t("classes.posts.attach", { defaultValue: "Đính kèm" })}
            </Button>
            {isTeacher && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={announcement} onChange={(e) => setAnnouncement(e.target.checked)} />
                {t("classes.posts.announcement", { defaultValue: "Thông báo quan trọng" })}
              </label>
            )}
          </div>
          <Button disabled={!content.trim() || publish.isPending} onClick={() => publish.mutate()}>
            {t("classes.posts.publish", { defaultValue: "Đăng" })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── one post ───────────────────────────────────────────────────

function PostCard({ classId, post }: { classId: string; post: ClassPostItem }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: POSTS_KEY(classId) });
  const fail = (e: unknown) => toast.error(getApiErrorMessage(e, t("classes.posts.actionFailed", { defaultValue: "Thao tác thất bại" })));

  const remove = useMutation({ mutationFn: () => deletePost(classId, post.id), onSuccess: refresh, onError: fail });
  const pin = useMutation({ mutationFn: () => updatePost(classId, post.id, { is_pinned: !post.is_pinned }), onSuccess: refresh, onError: fail });
  const toggleComments = useMutation({ mutationFn: () => updatePost(classId, post.id, { allow_comments: !post.allow_comments }), onSuccess: refresh, onError: fail });

  const isAnnouncement = post.type === "ANNOUNCEMENT";
  // old servers only sent can_edit (= teacher); newer ones say exactly who may moderate / delete
  const canModerate = post.can_moderate ?? post.can_edit;
  const canDelete = post.can_delete ?? post.can_edit;

  return (
    <Card className={cn("gap-0 overflow-hidden rounded-2xl py-0", isAnnouncement && "border-primary/30")}>
      {(isAnnouncement || post.is_pinned) && (
        <div className="flex items-center gap-3 bg-brand-soft px-4 py-1.5 text-xs font-medium text-brand-soft-foreground">
          {isAnnouncement && (
            <span className="flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" />{t("classes.posts.announcementBadge", { defaultValue: "Thông báo" })}</span>
          )}
          {post.is_pinned && (
            <span className="flex items-center gap-1.5"><Pin className="h-3.5 w-3.5" aria-hidden />{t("classes.posts.pinned", { defaultValue: "Đã ghim" })}</span>
          )}
        </div>
      )}
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <PersonAvatar person={post.author} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-tight">{post.author?.name}</p>
            <p className="text-xs text-muted-foreground">{fmtDateTime(post.published_at ?? post.created_at, locale)}</p>
          </div>
          {post.status === "DRAFT" && <Badge variant="outline">{t("classes.posts.draft", { defaultValue: "Nháp" })}</Badge>}
        </div>

        <div className="space-y-2">
          {post.title && <h3 className="text-lg font-semibold leading-snug">{post.title}</h3>}
          {/* plain text only: React escapes it and whitespace-pre-wrap keeps the line breaks */}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{post.content}</p>
        </div>

        {post.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {post.attachments.map((f) => (
              <li key={f.id}>
                <button type="button" className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => downloadFile(classId, f).catch(fail)}>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="max-w-56 truncate font-medium">{f.title || f.file_name}</span>
                  <span className="text-xs text-muted-foreground">({formatFileSize(f.file_size)})</span>
                  <Download className="h-3.5 w-3.5 shrink-0 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <ReactionBar classId={classId} targetType="post" targetId={post.id} summary={post.reactions} />
          {(canModerate || canDelete || post.can_edit) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              {canModerate && (
                <Button size="sm" variant="ghost" disabled={pin.isPending} onClick={() => pin.mutate()}>
                  {post.is_pinned ? t("classes.posts.unpin", { defaultValue: "Bỏ ghim" }) : t("classes.posts.pin", { defaultValue: "Ghim" })}
                </Button>
              )}
              {(canModerate || post.can_edit) && (
                <Button size="sm" variant="ghost" disabled={toggleComments.isPending} onClick={() => toggleComments.mutate()}>
                  {post.allow_comments ? t("classes.posts.closeComments", { defaultValue: "Tắt bình luận" }) : t("classes.posts.openComments", { defaultValue: "Bật bình luận" })}
                </Button>
              )}
              {canDelete && (
              <Button size="sm" variant="ghost" aria-label={t("classes.posts.delete", { defaultValue: "Xóa bài" })}
                disabled={remove.isPending}
                onClick={() => { if (window.confirm(t("classes.posts.confirmDelete", { defaultValue: "Xóa bài đăng này?" }))) remove.mutate(); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CommentThread classId={classId} post={post} />
    </Card>
  );
}

// ─── comments (everyone in the class may comment and react) ─────

function CommentThread({ classId, post }: { classId: string; post: ClassPostItem }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: POSTS_KEY(classId) });
  const fail = (e: unknown) => toast.error(getApiErrorMessage(e, t("classes.comments.failed", { defaultValue: "Không thể gửi bình luận" })));

  const send = useMutation({
    mutationFn: () => addComment(classId, post.id, text.trim(), replyTo?.id),
    onSuccess: () => { setText(""); setReplyTo(null); void refresh(); },
    onError: fail,
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteComment(classId, id), onSuccess: refresh, onError: fail });
  const hide = useMutation({ mutationFn: (c: PostComment) => setCommentHidden(classId, c.id, !c.is_hidden), onSuccess: refresh, onError: fail });

  // replies are one level deep on the server; group them under their parent
  const top = post.comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => post.comments.filter((c) => c.parent_id === id);

  const me = useAuthStore((state) => state.user);

  const renderComment = (c: PostComment, nested: boolean) => (
    <div key={c.id} className={nested ? "ml-10" : undefined}>
      <div className="flex gap-2.5">
        <PersonAvatar person={c.author} className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <div className={cn("inline-block max-w-full rounded-2xl rounded-tl-md border bg-card px-3.5 py-2", c.is_hidden && "opacity-60")}>
            <p className="text-sm font-semibold">{c.author?.name}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{c.content}</p>
            {c.is_hidden && <p className="mt-1 text-xs text-muted-foreground">{t("classes.comments.hidden", { defaultValue: "Bình luận đã bị ẩn" })}</p>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-muted-foreground">
            <span>{fmtDateTime(c.created_at, locale)}</span>
            <ReactionBar classId={classId} targetType="comment" targetId={c.id} summary={c.reactions} />
            {post.allow_comments && !c.is_hidden && !nested && (
              <button type="button" className="font-medium hover:text-foreground hover:underline" onClick={() => setReplyTo(c)}>{t("classes.comments.reply", { defaultValue: "Trả lời" })}</button>
            )}
            {c.can_hide && (
              <button type="button" className="flex items-center gap-1 hover:text-foreground hover:underline" onClick={() => hide.mutate(c)}>
                <EyeOff className="h-3 w-3" aria-hidden />{c.is_hidden ? t("classes.comments.unhide", { defaultValue: "Hiện" }) : t("classes.comments.hide", { defaultValue: "Ẩn" })}
              </button>
            )}
            {c.can_delete && (
              <button type="button" className="text-destructive hover:underline" onClick={() => remove.mutate(c.id)}>{t("classes.comments.delete", { defaultValue: "Xóa" })}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 border-t bg-muted/30 p-4 md:px-5">
      {top.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          {post.comments.length} {t("classes.comments.count", { defaultValue: "bình luận" })}
        </p>
      )}
      {top.map((c) => (
        <div key={c.id} className="space-y-2.5">
          {renderComment(c, false)}
          {repliesOf(c.id).map((r) => renderComment(r, true))}
        </div>
      ))}

      {post.allow_comments ? (
        <div className="space-y-2">
          {replyTo && (
            <p className="text-xs text-muted-foreground">
              {t("classes.comments.replyingTo", { defaultValue: "Đang trả lời" })} {replyTo.author?.name}{" "}
              <button type="button" className="underline" onClick={() => setReplyTo(null)}>{t("common.cancel", { defaultValue: "Hủy" })}</button>
            </p>
          )}
          <div className="flex items-end gap-2.5">
            <PersonAvatar person={{ name: me?.fullName ?? "?", avatar_url: me?.avatarUrl ?? null }} className="h-8 w-8" />
            <Textarea rows={1} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)}
              className="min-h-9 resize-none rounded-2xl bg-card"
              placeholder={t("classes.comments.placeholder", { defaultValue: "Viết bình luận..." })}
              aria-label={t("classes.comments.placeholder", { defaultValue: "Viết bình luận..." })} />
            <Button size="sm" disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>
              {t("classes.comments.send", { defaultValue: "Gửi" })}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("classes.comments.disabled", { defaultValue: "Bình luận đã bị tắt" })}</p>
      )}
    </div>
  );
}
