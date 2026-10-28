import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  ImageIcon,
  Info,
  MessageSquareText,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import type { Appeal, AppealImageResult, AppealStatus } from "../appeals.api";
import { SubmissionMetadata } from "@/features/grading/components/SubmissionMetadata";

type AppealReviewPanelProps = {
  appeal: Appeal;
  note: string;
  isResolving: boolean;
  onNoteChange: (value: string) => void;
  onAccept: () => void;
  onReject: () => void;
};

function formatDate(value?: string | null, locale = "vi-VN") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

function formatDateTime(value?: string | null, locale = "vi-VN") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getStatusBadgeClass(status: AppealStatus) {
  if (status === "ACCEPTED")
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-[#16251b] dark:text-emerald-200";
  if (status === "REVIEWED")
    return "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-[#172033] dark:text-blue-200";
  return "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-[#272114] dark:text-amber-200";
}

function imageFromResult(result?: AppealImageResult | null) {
  return resolveServerImageUrl(
    result?.processed_image_url ||
      result?.dewarped_image_url ||
      result?.raw_image_url,
  );
}

function previousImageFromSnapshot(snapshot?: AppealImageResult | null) {
  return resolveServerImageUrl(
    snapshot?.previous_processed_image_url ||
      snapshot?.previous_dewarped_image_url ||
      snapshot?.previous_raw_image_url,
  );
}

function ImagePreview({
  title,
  description,
  imageUrl,
  emptyLabel,
  action,
}: {
  title: string;
  description: string;
  imageUrl: string;
  emptyLabel: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppealReviewPanel({
  appeal,
  note,
  isResolving,
  onNoteChange,
  onAccept,
  onReject,
}: AppealReviewPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const snapshots = useMemo(() => {
    return [...(appeal.regradeSnapshots ?? [])].sort((left, right) => {
      const leftTime = left.created_at
        ? new Date(left.created_at).getTime()
        : 0;
      const rightTime = right.created_at
        ? new Date(right.created_at).getTime()
        : 0;
      return leftTime - rightTime;
    });
  }, [appeal.regradeSnapshots]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  );
  const selectedSnapshot =
    snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ??
    snapshots[snapshots.length - 1] ??
    null;
  const originalImageUrl =
    previousImageFromSnapshot(selectedSnapshot) ||
    imageFromResult(appeal.original_submission) ||
    resolveServerImageUrl(
      appeal.sheet.processed_image_url || appeal.sheet.dewarped_image_url,
    );
  const reviewedImageUrl = imageFromResult(
    selectedSnapshot ?? appeal.reviewed_result,
  );
  const snapshotCount = snapshots.length || (appeal.reviewed_result ? 1 : 0);
  const needsMobileRescan =
    appeal.status === "REVIEWED" && !appeal.reviewed_result;
  const canReview = appeal.status === "PENDING";

  useEffect(() => {
    setSelectedSnapshotId(snapshots[snapshots.length - 1]?.id ?? null);
  }, [appeal.id, snapshots]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-lg bg-muted/40 p-4 md:grid-cols-4">
        <div>
          <div className="text-sm text-muted-foreground">
            {t("appeals.studentCode")}
          </div>
          <div className="mt-1 font-medium">{appeal.student.code || "-"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">
            {t("appeals.currentScore")}
          </div>
          <div className="mt-1 font-medium">{appeal.old_score}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">
            {t("appeals.sentDate")}
          </div>
          <div className="mt-1 font-medium">
            {formatDate(appeal.created_at, locale)}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">
            {t("appeals.snapshots")}
          </div>
          <div className="mt-1 font-medium">{snapshotCount}</div>
        </div>
      </div>

      <SubmissionMetadata value={appeal.sheet} />

      <div className="space-y-3">
        <Label>{t("appeals.studentContent")}</Label>
        <div className="rounded-lg border border-border/50 bg-background p-4">
          {appeal.reason ? (
            <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {appeal.reason}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("appeals.noStudentMessage")}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
        <div className="mb-3 flex items-start gap-3">
          {needsMobileRescan ? (
            <Smartphone className="mt-0.5 h-5 w-5 text-blue-600" />
          ) : appeal.reviewed_result ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          ) : (
            <MessageSquareText className="mt-0.5 h-5 w-5 text-amber-600" />
          )}
          <div>
            <div className="font-medium text-foreground">
              {t("appeals.nextAction.title")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {canReview
                ? t("appeals.nextAction.reviewFirst")
                : needsMobileRescan
                  ? t("appeals.nextAction.mobileRescan")
                  : t("appeals.nextAction.completed")}
            </p>
          </div>
        </div>
        <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("appeals.webHandlingNotice")}</p>
        </div>
        {canReview && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div className="space-y-2">
              <Label htmlFor={`appeal-note-${appeal.id}`}>
                {t("appeals.noteLabel")}
              </Label>
              <Textarea
                id={`appeal-note-${appeal.id}`}
                placeholder={t("appeals.notePlaceholder")}
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={onReject}
                disabled={isResolving}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                {t("appeals.actions.reject")}
              </Button>
              <Button
                type="button"
                onClick={onAccept}
                disabled={isResolving}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("appeals.actions.accept")}
              </Button>
            </div>
          </div>
        )}
        {!canReview && appeal.teacher_note && (
          <div className="border-t border-border/50 pt-3">
            <div className="text-sm text-muted-foreground">
              {t("appeals.teacherResponse")}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {appeal.teacher_note}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {snapshotCount > 0 ? (
          <div className="xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-medium">
                  {t("appeals.snapshotCompare.title")}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("appeals.snapshotCompare.description")}
                </p>
              </div>
              {selectedSnapshot ? (
                <Badge variant="outline">
                  {formatDateTime(selectedSnapshot.created_at, locale)}
                </Badge>
              ) : null}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {snapshots.map((snapshot, index) => {
                const isSelected = snapshot.id === selectedSnapshot?.id;
                return (
                  <Button
                    key={snapshot.id ?? `${appeal.id}-${index}`}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => setSelectedSnapshotId(snapshot.id ?? null)}
                  >
                    {t("appeals.snapshotCompare.attempt", {
                      number: index + 1,
                    })}
                    <span
                      className={
                        isSelected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }
                    >
                      {formatDateTime(snapshot.created_at, locale)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
        <ImagePreview
          title={t("appeals.snapshotCompare.originalTitle")}
          description={
            selectedSnapshot
              ? t("appeals.snapshotCompare.originalDescription")
              : t("appeals.originalSubmissionHint")
          }
          imageUrl={originalImageUrl}
          emptyLabel={t("appeals.noOriginalSubmission")}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={`/exams/${appeal.exam.id}/results/${appeal.sheet.id}`}>
                {t("appeals.viewStudentResult")}
              </Link>
            </Button>
          }
        />
        <ImagePreview
          title={t("appeals.snapshotCompare.reviewedTitle")}
          description={
            selectedSnapshot
              ? t("appeals.snapshotCompare.reviewedDescription")
              : t("appeals.reviewedResultHint")
          }
          imageUrl={reviewedImageUrl}
          emptyLabel={
            needsMobileRescan
              ? t("appeals.noReviewedResultNeedRescan")
              : t("appeals.noReviewedResult")
          }
          action={
            appeal.reviewed_result ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  to={`/exams/${appeal.exam.id}/results/${appeal.sheet.id}`}
                >
                  {t("appeals.viewReviewedResult")}
                </Link>
              </Button>
            ) : null
          }
        />
      </div>
    </div>
  );
}
