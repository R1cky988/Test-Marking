import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import {
  EMPTY_REACTION_SUMMARY,
  getReactors,
  REACTION_TYPES,
  setReaction,
  type ReactionSummary,
  type ReactionTarget,
  type ReactionType,
} from "@/features/classes/reactions.api";

const EMOJI: Record<ReactionType, string> = {
  LIKE: "👍",
  LOVE: "❤️",
  HAHA: "😆",
  WOW: "😮",
  SAD: "😢",
  ANGRY: "😡",
};

const LABEL: Record<ReactionType, string> = {
  LIKE: "Thích",
  LOVE: "Yêu thích",
  HAHA: "Haha",
  WOW: "Wow",
  SAD: "Buồn",
  ANGRY: "Phẫn nộ",
};

interface ReactionBarProps {
  classId: string;
  targetType: ReactionTarget;
  /** uuid of the post / comment */
  targetId: string;
  /** summary that came with the feed item */
  summary?: ReactionSummary;
  /** lets the parent keep its own copy (e.g. a react-query cache) in sync */
  onSummaryChange?: (summary: ReactionSummary) => void;
  className?: string;
}

/**
 * Like button + emoji picker + "👍❤️ 12" chip. Clicking the chip opens the list of who reacted.
 * Click the main button to toggle LIKE, open the picker (smiley) to choose another reaction.
 */
export function ReactionBar({ classId, targetType, targetId, summary, onSummaryChange, className }: ReactionBarProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<ReactionSummary>(summary ?? EMPTY_REACTION_SUMMARY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (summary) setCurrent(summary);
  }, [summary]);

  const mutation = useMutation({
    mutationFn: (type: ReactionType | null) => setReaction(classId, targetType, targetId, type),
    onSuccess: (next) => {
      setCurrent(next);
      onSummaryChange?.(next);
      void queryClient.invalidateQueries({ queryKey: ["class-reactors", classId, targetType, targetId] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t("classes.reactions.error", { defaultValue: "Không thể cập nhật cảm xúc" })));
    },
  });

  const mine = current.viewer_reaction;
  const pick = (type: ReactionType) => {
    setPickerOpen(false);
    // choosing the reaction I already have removes it (like Facebook / Examxy)
    mutation.mutate(mine === type ? null : type);
  };
  const topTypes = [...current.counts].sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant={mine ? "secondary" : "ghost"}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(mine ? null : "LIKE")}
        aria-pressed={mine !== null}
      >
        <span className="mr-1" aria-hidden>{mine ? EMOJI[mine] : "👍"}</span>
        {mine ? t(`classes.reactions.${mine}`, { defaultValue: LABEL[mine] }) : t("classes.reactions.LIKE", { defaultValue: LABEL.LIKE })}
      </Button>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="ghost" disabled={mutation.isPending}
            aria-label={t("classes.reactions.choose", { defaultValue: "Chọn cảm xúc" })}>
            <span aria-hidden>😊</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto gap-1 p-2" align="start">
          {REACTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              title={t(`classes.reactions.${type}`, { defaultValue: LABEL[type] })}
              aria-label={t(`classes.reactions.${type}`, { defaultValue: LABEL[type] })}
              onClick={() => pick(type)}
              className={cn(
                "rounded-full p-1.5 text-2xl leading-none transition-transform hover:scale-125",
                mine === type && "bg-muted",
              )}
            >
              {EMOJI[type]}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {current.total_count > 0 && (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
          aria-label={t("classes.reactions.whoReacted", { defaultValue: "Xem ai đã bày tỏ cảm xúc" })}
        >
          <span aria-hidden>{topTypes.map((c) => EMOJI[c.reaction_type]).join("")}</span>
          <span>{current.total_count}</span>
        </button>
      )}

      {listOpen && (
        <ReactorsDialog
          classId={classId}
          targetType={targetType}
          targetId={targetId}
          counts={current.counts}
          total={current.total_count}
          onClose={() => setListOpen(false)}
        />
      )}
    </div>
  );
}

function ReactorsDialog(props: {
  classId: string;
  targetType: ReactionTarget;
  targetId: string;
  counts: ReactionSummary["counts"];
  total: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ReactionType | "ALL">("ALL");
  const query = useQuery({
    queryKey: ["class-reactors", props.classId, props.targetType, props.targetId],
    queryFn: () => getReactors(props.classId, props.targetType, props.targetId),
  });
  const rows = (query.data ?? []).filter((r) => filter === "ALL" || r.reaction_type === filter);

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("classes.reactions.title", { defaultValue: "Cảm xúc" })}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("classes.reactions.whoReacted", { defaultValue: "Xem ai đã bày tỏ cảm xúc" })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1">
          <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")}>
            {t("classes.reactions.all", { defaultValue: "Tất cả" })} {props.total}
          </FilterChip>
          {props.counts.map((c) => (
            <FilterChip key={c.reaction_type} active={filter === c.reaction_type} onClick={() => setFilter(c.reaction_type)}>
              {EMOJI[c.reaction_type]} {c.count}
            </FilterChip>
          ))}
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {query.isLoading && (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          )}
          {query.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(query.error, t("classes.reactions.loadError", { defaultValue: "Không tải được danh sách" }))}
            </p>
          )}
          {rows.map((r) => (
            <div key={r.user_id} className="flex items-center gap-3 rounded-md px-1 py-1.5">
              <Avatar className="size-9">
                <AvatarImage src={resolveServerImageUrl(r.avatar_url) ?? undefined} alt="" />
                <AvatarFallback>{r.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm">{r.name}</span>
              <span className="text-xl" title={t(`classes.reactions.${r.reaction_type}`, { defaultValue: LABEL[r.reaction_type] })}>
                {EMOJI[r.reaction_type]}
              </span>
            </div>
          ))}
          {query.isSuccess && rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("classes.reactions.empty", { defaultValue: "Chưa có cảm xúc nào" })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-sm", active ? "border-primary bg-primary/10" : "hover:bg-muted")}
    >
      {children}
    </button>
  );
}
