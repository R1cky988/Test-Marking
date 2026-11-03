import { FileUp, PenLine, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/components/ui/utils";
import type { Exam, ExamFormat } from "../examsSpring.api";

export const FORMAT_ICON: Record<ExamFormat, ReactNode> = {
  OFFLINE: <PenLine className="h-4 w-4" />,
  ONLINE: <Smartphone className="h-4 w-4" />,
  SUBMIT: <FileUp className="h-4 w-4" />,
};

const FORMAT_TONE: Record<ExamFormat, string> = {
  OFFLINE: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  ONLINE: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200",
  SUBMIT: "bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-200",
};

export function useFormatText() {
  const { t } = useTranslation();
  return (f: ExamFormat) => ({
    OFFLINE: { name: t("exam.format.OFFLINE", "Offline"), hint: t("exam.format.OFFLINEHint", "Thi trên giấy, giáo viên chấm rồi công bố kết quả sau.") },
    ONLINE: { name: t("exam.format.ONLINE", "Online"), hint: t("exam.format.ONLINEHint", "Học sinh làm bài trên điện thoại; có thể hiện kết quả ngay.") },
    SUBMIT: { name: t("exam.format.SUBMIT", "Nộp bài"), hint: t("exam.format.SUBMITHint", "Học sinh làm trên giấy, chụp ảnh qua app để nộp; không hiện kết quả ngay.") },
  })[f];
}

export function FormatBadge({ format }: { format: ExamFormat }) {
  const text = useFormatText();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", FORMAT_TONE[format])}>
      {FORMAT_ICON[format]}
      {text(format).name}
    </span>
  );
}

export function StatusBadge({ status }: { status: Exam["status"] }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; tone: string }> = {
    DRAFT: { label: t("exam.status.DRAFT", "Bản nháp"), tone: "bg-muted text-muted-foreground" },
    UPCOMING: { label: t("exam.status.UPCOMING", "Sắp diễn ra"), tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200" },
    ONGOING: { label: t("exam.status.ONGOING", "Đang diễn ra"), tone: "bg-green-100 text-green-900 dark:bg-green-500/15 dark:text-green-200" },
    COMPLETED: { label: t("exam.status.COMPLETED", "Đã kết thúc"), tone: "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200" },
    CANCELLED: { label: t("exam.status.CANCELLED", "Đã hủy"), tone: "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200" },
  };
  const m = map[status] ?? { label: status, tone: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", m.tone)}>{m.label}</span>;
}

export function useResultText() {
  const { t } = useTranslation();
  return (exam: Pick<Exam, "result_policy">) =>
    exam.result_policy === "IMMEDIATE"
      ? t("exam.result.immediate", "Hiện kết quả ngay sau khi nộp")
      : t("exam.result.later", "Giáo viên công bố kết quả sau");
}
