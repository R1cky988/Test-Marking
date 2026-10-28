import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";

export interface SubmissionMetadataValue {
  submission_mode?: string | null;
  offline_verified?: boolean;
  received_at?: string | null;
  security_flags?: Record<string, unknown> | null;
  class_code?: string | null;
  exam_code?: string | null;
}

function isWarningFlag(key: string, value: unknown) {
  if (value === false) return true;
  return (
    value === true &&
    /(mismatch|invalid|after_deadline|tamper|root|debug)/i.test(key)
  );
}

function formatFlag(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SubmissionMetadata({
  value,
}: {
  value: SubmissionMetadataValue;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const isOffline = value.submission_mode === "offline_sync";
  const flags = Object.entries(value.security_flags ?? {});
  const warningFlags = flags.filter(([key, flagValue]) =>
    isWarningFlag(key, flagValue),
  );
  const receivedAt = value.received_at ? new Date(value.received_at) : null;
  const receivedLabel =
    receivedAt && !Number.isNaN(receivedAt.getTime())
      ? receivedAt.toLocaleString(locale, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 font-medium">
        {isOffline ? (
          <CloudUpload className="h-4 w-4 text-blue-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        )}
        {isOffline
          ? t("submissionMetadata.offlineSync")
          : t("submissionMetadata.online")}
      </div>
      {isOffline && (
        <Badge
          variant={value.offline_verified ? "outline" : "destructive"}
          className="gap-1"
        >
          {value.offline_verified ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {value.offline_verified
            ? t("submissionMetadata.verified")
            : t("submissionMetadata.notVerified")}
        </Badge>
      )}
      <span className="text-muted-foreground">
        {t("submissionMetadata.classCode")}:{" "}
        <strong className="text-foreground">{value.class_code || "-"}</strong>
      </span>
      <span className="text-muted-foreground">
        {t("submissionMetadata.examCode")}:{" "}
        <strong className="text-foreground">{value.exam_code || "-"}</strong>
      </span>
      {receivedLabel && (
        <span className="text-muted-foreground">
          {t("submissionMetadata.receivedAt")}:{" "}
          <strong className="text-foreground">{receivedLabel}</strong>
        </span>
      )}
      {warningFlags.length > 0 && (
        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {t("submissionMetadata.securityWarning")}:{" "}
            {warningFlags.map(([key]) => formatFlag(key)).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
