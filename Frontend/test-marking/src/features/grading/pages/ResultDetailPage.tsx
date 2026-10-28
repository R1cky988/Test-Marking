import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useGoBack } from "@/hooks/useGoBack";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { resolveServerImageUrl } from "@/lib/resolveServerImageUrl";
import { SubmissionMetadata } from "@/features/grading/components/SubmissionMetadata";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import type { OmrGridConfig } from "@/types/academic.types";
import { exportSheetPdf } from "@/features/exports/exports.api";
import type {
  AnswerDetail,
  AnswerSheetDetail,
  OmrConfidenceDetail,
} from "../grading.api";
import {
  formatAnswerValue,
  getExamAnswerSheet,
  uploadProcessedImage,
} from "../grading.api";

const PAGE_WIDTH = 827;
const PAGE_HEIGHT = 1169;
const GRID_PADDING = 5;
const NUMBER_COLUMN_RATIO = 0.12;
const NUMBER_COLUMN_MIN_WIDTH = 14;
const NUMBER_COLUMN_MAX_WIDTH = 30;
const NUMBER_COLUMN_MAX_TOTAL_RATIO = 0.32;
const BUBBLE_RATIO = 0.8;
const ID_LABEL_ROW_HEIGHT = 16;
const ID_LABEL_GAP = 2;
const ID_WRITE_BOX_PAD = 4;
const ID_WRITE_BOX_GAP = 3;
const ID_LEFT_NUMBER_GAP = 4;
const ID_GROUP_GAP = 12;
const ID_NUM_ROWS = 10;
const ID_BUBBLE_MIN_SIZE = 15;
const BUBBLE_MAX_SIZE = 25;
const BUBBLE_DEFAULT_SIZE = 18;
const GRID_MAX_SPACING = 40;
const GRID_MIN_SPACING = 4;
const DEBUG_GRID_COLOR = "#787878";
const DEBUG_CORRECT_COLOR = "#00ff00";
const DEBUG_WRONG_COLOR = "#ff0000";
const DEBUG_MISSED_COLOR = "#ffff00";
const DEBUG_SELECTED_COLOR = "#0066ff";
const DEBUG_IDENTIFICATION_COLOR = "#0066ff";

interface AnswerGridCell {
  type: "question_number" | "choice";
  questionNumber: number;
  choiceLetter?: string;
  x: number;
  y: number;
}

interface IdGridCell {
  type: "student_id" | "class_code" | "exam_code";
  column: number;
  row: number;
  x: number;
  y: number;
  radius: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function calculateAnswerGridLayout(params: {
  boundingBox: { x: number; y: number; width: number; height: number };
  rows: number;
  options: number;
  hasStartNumber: boolean;
  hasEndNumber: boolean;
  startQuestionIndex: number;
}) {
  const {
    boundingBox,
    rows,
    options,
    hasStartNumber,
    hasEndNumber,
    startQuestionIndex,
  } = params;
  if (rows <= 0 || options <= 0)
    return { cells: [] as AnswerGridCell[], bubbleSize: 0 };

  const padding = Math.min(
    GRID_PADDING,
    boundingBox.width / 8,
    boundingBox.height / 8,
  );
  const innerX = boundingBox.x + padding;
  const innerY = boundingBox.y + padding;
  const innerWidth = Math.max(1, boundingBox.width - padding * 2);
  const innerHeight = Math.max(1, boundingBox.height - padding * 2);
  const numberColumnCount = Number(hasStartNumber) + Number(hasEndNumber);
  const preferredNumberWidth = clamp(
    innerWidth * NUMBER_COLUMN_RATIO,
    NUMBER_COLUMN_MIN_WIDTH,
    NUMBER_COLUMN_MAX_WIDTH,
  );
  const totalNumberWidth =
    numberColumnCount > 0
      ? Math.min(
          preferredNumberWidth * numberColumnCount,
          innerWidth * NUMBER_COLUMN_MAX_TOTAL_RATIO,
        )
      : 0;
  const numberColumnWidth =
    numberColumnCount > 0 ? totalNumberWidth / numberColumnCount : 0;
  const startNumberWidth = hasStartNumber ? numberColumnWidth : 0;
  const endNumberWidth = hasEndNumber ? numberColumnWidth : 0;
  const choiceAreaX = innerX + startNumberWidth;
  const choiceAreaWidth = Math.max(
    1,
    innerWidth - startNumberWidth - endNumberWidth,
  );
  const choiceStep = choiceAreaWidth / options;
  const rowStep = innerHeight / rows;
  const bubbleSize = clamp(
    Math.min(choiceStep, rowStep) * BUBBLE_RATIO,
    4,
    BUBBLE_MAX_SIZE,
  );
  const cells: AnswerGridCell[] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const questionNumber = startQuestionIndex + rowIndex;
    const y = innerY + (rowIndex + 0.5) * rowStep;
    for (let optionIndex = 0; optionIndex < options; optionIndex += 1) {
      cells.push({
        type: "choice",
        questionNumber,
        choiceLetter: String.fromCharCode(65 + optionIndex),
        x: choiceAreaX + (optionIndex + 0.5) * choiceStep,
        y,
      });
    }
  }

  return { cells, bubbleSize };
}

function calculateGridSpacing(
  totalWidth: number,
  columns: number,
  bubbleSize: number,
) {
  if (columns <= 0 || totalWidth <= 0)
    return { ok: false, spacing: 0, offset: 0 };
  if (columns === 1) {
    const offset = (totalWidth - bubbleSize) / 2;
    return { ok: offset >= -0.01, spacing: 0, offset: Math.max(0, offset) };
  }

  const effectiveMin = bubbleSize + GRID_MIN_SPACING;
  const spacing = clamp(
    (totalWidth - bubbleSize) / (columns - 1),
    effectiveMin,
    GRID_MAX_SPACING,
  );
  const occupiedWidth = (columns - 1) * spacing + bubbleSize;
  if (occupiedWidth > totalWidth + 0.01)
    return { ok: false, spacing: 0, offset: 0 };
  return {
    ok: true,
    spacing,
    offset: Math.max(0, (totalWidth - occupiedWidth) / 2),
  };
}

function calculateIdGridLayout(gridConfig: OmrGridConfig) {
  const idZone = gridConfig.id_zones;
  const enabledItems =
    idZone?.items?.filter(
      (item) => item.enabled !== false && item.num_digits > 0,
    ) ?? [];
  const totalColumns = enabledItems.reduce(
    (sum, item) => sum + item.num_digits,
    0,
  );
  if (!idZone || totalColumns <= 0) return [] as IdGridCell[];

  const box = idZone.bounding_box;
  const padding = Math.min(GRID_PADDING, box.width / 8, box.height / 8);
  const effectiveX = box.x + padding;
  const effectiveY = box.y + padding;
  const effectiveWidth = Math.max(1, box.width - padding * 2);
  const effectiveHeight = Math.max(1, box.height - padding * 2);
  const estimatedOverhead =
    ID_LABEL_ROW_HEIGHT +
    ID_LABEL_GAP +
    BUBBLE_DEFAULT_SIZE +
    ID_WRITE_BOX_PAD +
    ID_WRITE_BOX_GAP;
  const estimatedGridHeight = Math.max(1, effectiveHeight - estimatedOverhead);
  const rawDx = effectiveWidth / totalColumns;
  const rawDy = estimatedGridHeight / ID_NUM_ROWS;
  const bubbleSize = Math.min(
    Math.min(rawDx, rawDy) * BUBBLE_RATIO,
    BUBBLE_MAX_SIZE,
  );
  if (bubbleSize < ID_BUBBLE_MIN_SIZE) return [];

  const preliminary = calculateGridSpacing(
    effectiveWidth,
    totalColumns,
    bubbleSize,
  );
  const preliminarySpacing =
    preliminary.ok && preliminary.spacing > 0
      ? preliminary.spacing
      : bubbleSize;
  const rowNumberWidth = Math.min(preliminarySpacing, effectiveWidth * 0.15);
  const bubbleGridWidth = effectiveWidth - rowNumberWidth - ID_LEFT_NUMBER_GAP;
  if (bubbleGridWidth <= 0) return [];

  const groupGap = enabledItems.length > 1 ? ID_GROUP_GAP : 0;
  const columnGridWidth =
    bubbleGridWidth - Math.max(0, enabledItems.length - 1) * groupGap;
  if (columnGridWidth <= 0) return [];

  const bubbleGridX = effectiveX + rowNumberWidth + ID_LEFT_NUMBER_GAP;
  const writeBoxRowHeight = bubbleSize + ID_WRITE_BOX_PAD;
  const topOverhead =
    ID_LABEL_ROW_HEIGHT + ID_LABEL_GAP + writeBoxRowHeight + ID_WRITE_BOX_GAP;
  const bubbleGridHeight = effectiveHeight - topOverhead;
  if (bubbleGridHeight <= 0) return [];

  const bubbleGridY = effectiveY + topOverhead;
  const horizontal = calculateGridSpacing(
    columnGridWidth,
    totalColumns,
    bubbleSize,
  );
  const vertical = calculateGridSpacing(
    bubbleGridHeight,
    ID_NUM_ROWS,
    bubbleSize,
  );
  const columnSpacing =
    horizontal.ok && horizontal.spacing > 0
      ? horizontal.spacing
      : columnGridWidth / totalColumns;
  const columnOffset =
    horizontal.ok && horizontal.spacing > 0 ? horizontal.offset : 0;
  const rowSpacing =
    vertical.ok && vertical.spacing > 0
      ? vertical.spacing
      : bubbleGridHeight / ID_NUM_ROWS;
  const rowOffset = vertical.ok && vertical.spacing > 0 ? vertical.offset : 0;

  const cells: IdGridCell[] = [];
  let columnIndex = 0;
  enabledItems.forEach((item, itemIndex) => {
    const groupOffsetX = itemIndex * groupGap;
    for (let digitIndex = 0; digitIndex < item.num_digits; digitIndex += 1) {
      const x =
        bubbleGridX +
        columnOffset +
        groupOffsetX +
        columnIndex * columnSpacing +
        bubbleSize / 2;
      for (let row = 0; row < ID_NUM_ROWS; row += 1) {
        cells.push({
          type: item.type,
          column: columnIndex,
          row,
          x,
          y: bubbleGridY + rowOffset + row * rowSpacing + bubbleSize / 2,
          radius: bubbleSize / 2,
        });
      }
      columnIndex += 1;
    }
  });

  return cells;
}

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(2);
}

function getConfidenceByQuestion(details: OmrConfidenceDetail[]) {
  return new Map(details.map((detail) => [detail.question_number, detail]));
}

function statusLabel(answer: AnswerDetail, confidence?: OmrConfidenceDetail) {
  if (answer.is_correct && !answer.is_flagged && !confidence?.needs_review) {
    return {
      label: i18n.t("gradingDetail.status.correct"),
      className: "text-green-600",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  if (answer.is_flagged || confidence?.needs_review) {
    return {
      label: i18n.t("gradingDetail.status.needsReview"),
      className: "text-amber-600",
      icon: <AlertCircle className="h-4 w-4" />,
    };
  }

  return {
    label: i18n.t("gradingDetail.status.incorrect"),
    className: "text-red-600",
    icon: <XCircle className="h-4 w-4" />,
  };
}

function StatusBadge({
  answer,
  confidence,
}: {
  answer: AnswerDetail;
  confidence?: OmrConfidenceDetail;
}) {
  const status = statusLabel(answer, confidence);
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${status.className}`}
    >
      {status.icon}
      {status.label}
    </span>
  );
}

function getImageExtension(url: string) {
  const cleanUrl = url.split("?")[0] ?? url;
  const extension = cleanUrl
    .match(/\.(png|jpe?g|webp|gif)$/i)?.[1]
    ?.toLowerCase();
  if (!extension) return "jpg";
  return extension === "jpeg" ? "jpg" : extension;
}

async function downloadImage(url: string, filename: string) {
  let blob: Blob;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Unable to download image");
    blob = await response.blob();
  } catch (error) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function ImagePanel({
  title,
  url,
  filenamePrefix,
}: {
  title: string;
  url: string | null;
  filenamePrefix: string;
}) {
  const { t } = useTranslation();
  const resolvedUrl = resolveServerImageUrl(url);
  const handleDownload = async () => {
    if (!resolvedUrl) return;
    try {
      await downloadImage(
        resolvedUrl,
        `${filenamePrefix}.${getImageExtension(resolvedUrl)}`,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("gradingDetail.exportAttach.downloadImageFailed"),
        ),
      );
    }
  };

  return (
    <div>
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        {resolvedUrl ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void handleDownload()}
            title={t("gradingDetail.images.download")}
            aria-label={t("gradingDetail.images.download")}
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="flex aspect-[210/297] items-center justify-center overflow-hidden rounded-md border bg-muted">
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={title}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-muted-foreground/70">
            {t("gradingDetail.noImage")}
          </span>
        )}
      </div>
    </div>
  );
}

function getStudentDisplayCode(sheet: AnswerSheetDetail) {
  return sheet.identification_mode === "EXTERNAL"
    ? sheet.student.student_code || "—"
    : sheet.student.internal_id || "—";
}

function answerChoices(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(answerChoices);
  return String(value)
    .split(/[,;/|\s]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeIdValue(value: string | null | undefined, digits: number) {
  const onlyDigits = String(value ?? "").replace(/\D/g, "");
  return Array.from({ length: digits }, (_, index) => {
    const digit = onlyDigits[index];
    return digit === undefined ? -1 : Number(digit);
  });
}

function toInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

function toNonNegativeInteger(value: unknown): number | null {
  const numeric = toInteger(value);
  return numeric === null ? null : Math.max(0, numeric);
}

function toPositiveInteger(value: unknown): number | null {
  const numeric = toInteger(value);
  return numeric !== null && numeric > 0 ? numeric : null;
}

function resolveAnswerZoneRows(zone: any): number {
  const layoutRows = toNonNegativeInteger(zone.layout?.rows);
  if (layoutRows !== null) return layoutRows;

  const start = toInteger(zone.start_number ?? zone.startNumber);
  const end = toInteger(zone.end_number ?? zone.endNumber);
  if (start !== null && end !== null) {
    return Math.max(0, end - start + 1);
  }

  return 0;
}

function resolveAnswerZoneOptions(zone: any): number {
  return (
    toPositiveInteger(
      zone.layout?.options ??
        zone.options_per_question ??
        zone.optionsPerQuestion,
    ) ?? 4
  );
}

function resolveStartQuestionIndex(zone: any, fallback: number): number {
  return (
    toPositiveInteger(
      zone.layout?.start_question_index ??
        zone.layout?.startQuestionIndex ??
        zone.start_question_index ??
        zone.startQuestionIndex ??
        zone.start_number ??
        zone.startNumber,
    ) ?? fallback
  );
}

function getSheetIdValues(sheet: AnswerSheetDetail) {
  return {
    student_id:
      sheet.student_id ??
      (sheet.identification_mode === "EXTERNAL"
        ? (sheet.student.student_code ?? "")
        : (sheet.student.internal_id ?? sheet.student.student_code ?? "")),
    class_code: sheet.class_code ?? sheet.exam.class_code ?? "",
    exam_code: sheet.exam_code ?? sheet.exam_version?.version_code ?? "",
  } satisfies Record<"student_id" | "class_code" | "exam_code", string>;
}

function loadCanvasImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load result image"));
    image.src = url;
  });
}

function drawRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  lineWidth = 4,
) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.lineWidth = lineWidth;
  context.strokeStyle = color;
  context.stroke();
}

async function createProcessedDebugImage(
  sheet: AnswerSheetDetail,
): Promise<Blob> {
  const gridConfig = sheet.template?.grid_config as
    | OmrGridConfig
    | null
    | undefined;
  const reviewedResult =
    sheet.reviewed_result ??
    sheet.latest_regrade_snapshot ??
    sheet.regradeSnapshots?.[0] ??
    null;
  const sourceUrl =
    reviewedResult?.dewarped_image_url ??
    reviewedResult?.raw_image_url ??
    sheet.dewarped_image_url ??
    sheet.raw_image_url;
  if (!gridConfig?.answer_zones?.length || !sourceUrl) {
    throw new Error("Missing visual debug data");
  }

  const image = await loadCanvasImage(resolveServerImageUrl(sourceUrl));
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create canvas context");

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const scaleX = canvas.width / PAGE_WIDTH;
  const scaleY = canvas.height / PAGE_HEIGHT;
  const radiusScale = Math.min(scaleX, scaleY);
  const answers = new Map(
    sheet.answer_details.map((detail) => [detail.question_number, detail]),
  );

  const idValues = getSheetIdValues(sheet);
  const selectedIdDigits = (gridConfig.id_zones?.items ?? []).flatMap(
    (item) => {
      if (item.enabled === false) return [];
      return normalizeIdValue(idValues[item.type], item.num_digits);
    },
  );

  if (selectedIdDigits.length > 0) {
    for (const cell of calculateIdGridLayout(gridConfig)) {
      const x = cell.x * scaleX;
      const y = cell.y * scaleY;
      const radius = cell.radius * radiusScale;
      drawRing(context, x, y, radius, DEBUG_GRID_COLOR, 1);
      if (selectedIdDigits[cell.column] === cell.row) {
        drawRing(context, x, y, radius, DEBUG_IDENTIFICATION_COLOR, 2);
      }
    }
  }

  let questionStart = 1;
  for (const zone of gridConfig.answer_zones ?? []) {
    const rows = resolveAnswerZoneRows(zone);
    const options = resolveAnswerZoneOptions(zone);
    const startQuestionIndex = resolveStartQuestionIndex(zone, questionStart);

    if (rows > 0 && options > 0) {
      const { cells, bubbleSize } = calculateAnswerGridLayout({
        boundingBox: zone.bounding_box,
        rows,
        options,
        hasStartNumber: zone.layout?.has_start_number ?? true,
        hasEndNumber: zone.layout?.has_end_number ?? false,
        startQuestionIndex,
      });
      const radius = Math.max(2, (bubbleSize / 2) * radiusScale);

      for (const cell of cells) {
        if (cell.type !== "choice" || !cell.choiceLetter) continue;
        const x = cell.x * scaleX;
        const y = cell.y * scaleY;
        drawRing(context, x, y, radius, DEBUG_GRID_COLOR, 1);

        const answer = answers.get(cell.questionNumber);
        if (!answer) continue;

        const selected = answerChoices(answer.student_answer);
        const correct = answerChoices(answer.correct_answer);
        const isSelected = selected.includes(cell.choiceLetter);
        const isCorrectChoice = correct.includes(cell.choiceLetter);
        const hasCorrectAnswer = correct.length > 0;

        if (isSelected && !hasCorrectAnswer) {
          drawRing(context, x, y, radius, DEBUG_SELECTED_COLOR, 2);
          continue;
        }

        if (isSelected && isCorrectChoice) {
          drawRing(context, x, y, radius, DEBUG_CORRECT_COLOR, 2);
        } else if (isSelected && !isCorrectChoice) {
          drawRing(context, x, y, radius, DEBUG_WRONG_COLOR, 2);
        }

        if (!isSelected && isCorrectChoice && !answer.is_correct) {
          drawRing(context, x, y, radius, DEBUG_MISSED_COLOR, 2);
        }

        if (answer.is_flagged && isCorrectChoice) {
          drawRing(context, x, y, radius * 1.15, DEBUG_MISSED_COLOR, 2);
        }
      }
    }
    questionStart += rows;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to export visual debug image"));
      },
      "image/jpeg",
      0.82,
    );
  });
}

export function ResultDetailPage() {
  const { id, sheetId, studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const goBack = useGoBack(id ? `/exams/${id}/results` : "/exams");
  const currentSheetId = sheetId ?? studentId;
  const [sheet, setSheet] = useState<AnswerSheetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDebug, setIsGeneratingDebug] = useState(false);
  const [isRetryingExport, setIsRetryingExport] = useState(false);
  const attachMode = searchParams.get("attach") === "processed";
  const shouldRetryExport = searchParams.get("retryExport") === "1";
  const reviewedResult =
    sheet?.reviewed_result ??
    sheet?.latest_regrade_snapshot ??
    sheet?.regradeSnapshots?.[0] ??
    null;
  const rawImageUrl =
    reviewedResult?.raw_image_url ?? sheet?.raw_image_url ?? null;
  const dewarpedImageUrl =
    reviewedResult?.dewarped_image_url ?? sheet?.dewarped_image_url ?? null;
  const processedImageUrl =
    reviewedResult?.processed_image_url ?? sheet?.processed_image_url ?? null;

  async function loadData() {
    if (!id || !currentSheetId) return;

    try {
      setIsLoading(true);
      setSheet(await getExamAnswerSheet(id, currentSheetId, true));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("gradingDetail.errors.load")));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id, currentSheetId]);

  function clearAttachRetryParams() {
    const next = new URLSearchParams(searchParams);
    next.delete("attach");
    next.delete("retryExport");
    setSearchParams(next, { replace: true });
  }

  async function handleRetryExportAfterAttach() {
    if (!currentSheetId || isRetryingExport) return;
    try {
      setIsRetryingExport(true);
      const result = await exportSheetPdf(currentSheetId);
      window.open(result.download_url, "_blank", "noopener,noreferrer");
      clearAttachRetryParams();
      toast.success(t("gradingDetail.exportAttach.retrySuccess"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t("gradingDetail.exportAttach.retryFailed")),
      );
    } finally {
      setIsRetryingExport(false);
    }
  }

  async function handleGenerateVisualDebug() {
    if (!id || !currentSheetId || !sheet || processedImageUrl) return;
    try {
      setIsGeneratingDebug(true);
      const blob = await createProcessedDebugImage(sheet);
      const result = await uploadProcessedImage(id, currentSheetId, blob);
      setSheet((current) => {
        if (!current) return current;
        const firstSnapshot =
          current.reviewed_result ??
          current.latest_regrade_snapshot ??
          current.regradeSnapshots?.[0] ??
          null;
        const updateSnapshot = (snapshot: typeof firstSnapshot) =>
          snapshot
            ? { ...snapshot, processed_image_url: result.processed_image_url }
            : snapshot;

        return {
          ...current,
          processed_image_url: result.processed_image_url,
          reviewed_result: firstSnapshot
            ? updateSnapshot(current.reviewed_result ?? firstSnapshot)
            : current.reviewed_result,
          latest_regrade_snapshot: firstSnapshot
            ? updateSnapshot(current.latest_regrade_snapshot ?? firstSnapshot)
            : current.latest_regrade_snapshot,
          regradeSnapshots:
            firstSnapshot && current.regradeSnapshots?.length
              ? current.regradeSnapshots.map((snapshot, index) =>
                  index === 0
                    ? {
                        ...snapshot,
                        processed_image_url: result.processed_image_url,
                      }
                    : snapshot,
                )
              : current.regradeSnapshots,
        };
      });
      toast.success(t("gradingDetail.exportAttach.generateSuccess"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("gradingDetail.exportAttach.generateFailed"),
        ),
      );
    } finally {
      setIsGeneratingDebug(false);
    }
  }

  useEffect(() => {
    if (!sheet || processedImageUrl || isGeneratingDebug) return;
    void handleGenerateVisualDebug();
  }, [sheet?.id, processedImageUrl]);

  useEffect(() => {
    if (
      !shouldRetryExport ||
      !processedImageUrl ||
      isGeneratingDebug ||
      isRetryingExport
    )
      return;
    void handleRetryExportAfterAttach();
  }, [
    shouldRetryExport,
    processedImageUrl,
    isGeneratingDebug,
    isRetryingExport,
  ]);

  const confidenceByQuestion = useMemo(
    () => getConfidenceByQuestion(sheet?.omr_confidence_details ?? []),
    [sheet],
  );
  const totalQuestions = sheet?.answer_details.length ?? 0;
  const correctCount =
    sheet?.answer_details.filter((answer) => answer.is_correct).length ?? 0;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("gradingDetail.backToResults")}
        </button>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {t("gradingDetail.title")}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {sheet
                ? t("gradingDetail.subtitle", {
                    code: getStudentDisplayCode(sheet),
                    name: sheet.student.full_name,
                  })
                : t("gradingDetail.fallbackTitle")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("gradingDetail.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t("gradingDetail.totalScore")}
            </div>
            <div className="mt-1 text-3xl font-semibold text-primary">
              {sheet ? formatScore(sheet.total_score) : "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t("gradingDetail.correctCount")}
            </div>
            <div className="mt-1 text-3xl font-semibold text-green-600">
              {correctCount}/{totalQuestions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {t("gradingDetail.accuracy")}
            </div>
            <div className="mt-1 text-3xl font-semibold">{accuracy}%</div>
          </CardContent>
        </Card>
      </div>

      {sheet && <SubmissionMetadata value={sheet} />}

      <Tabs defaultValue="visual">
        <TabsList>
          <TabsTrigger value="visual">
            {t("gradingDetail.tabs.visual")}
          </TabsTrigger>
          <TabsTrigger value="table">
            {t("gradingDetail.tabs.table")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("gradingDetail.visual.title")}</CardTitle>
              <CardDescription>
                {t("gradingDetail.visual.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachMode ? (
                <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
                  <RefreshCw
                    className={`h-4 w-4 ${isGeneratingDebug || isRetryingExport ? "animate-spin" : ""}`}
                  />
                  <AlertTitle>
                    {t("gradingDetail.exportAttach.title")}
                  </AlertTitle>
                  <AlertDescription>
                    {processedImageUrl
                      ? isRetryingExport
                        ? t("gradingDetail.exportAttach.retrying")
                        : t("gradingDetail.exportAttach.ready")
                      : t("gradingDetail.exportAttach.creating")}
                  </AlertDescription>
                </Alert>
              ) : null}
              {!processedImageUrl ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <span>{t("gradingDetail.visual.noProcessedHint")}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2 bg-white"
                    onClick={() => void handleGenerateVisualDebug()}
                    disabled={isGeneratingDebug}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isGeneratingDebug ? "animate-spin" : ""}`}
                    />
                    {t("gradingDetail.visual.generateProcessed")}
                  </Button>
                </div>
              ) : null}
              <div className="grid gap-6 lg:grid-cols-3">
                <ImagePanel
                  title={t("gradingDetail.images.raw")}
                  url={rawImageUrl}
                  filenamePrefix={`${currentSheetId}-raw`}
                />
                <ImagePanel
                  title={t("gradingDetail.images.dewarped")}
                  url={dewarpedImageUrl}
                  filenamePrefix={`${currentSheetId}-dewarped`}
                />
                <ImagePanel
                  title={t("gradingDetail.images.processed")}
                  url={processedImageUrl}
                  filenamePrefix={`${currentSheetId}-processed`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>{t("gradingDetail.table.title")}</CardTitle>
              <CardDescription>
                {t("gradingDetail.table.legendDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("gradingDetail.table.question")}</TableHead>
                    <TableHead>
                      {t("gradingDetail.table.studentAnswer")}
                    </TableHead>
                    <TableHead>
                      {t("gradingDetail.table.correctAnswer")}
                    </TableHead>
                    <TableHead>{t("gradingDetail.table.status")}</TableHead>
                    <TableHead>{t("gradingDetail.table.confidence")}</TableHead>
                    <TableHead>{t("gradingDetail.table.score")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("common.loading")}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !sheet && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("gradingDetail.noData")}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    sheet?.answer_details.map((answer) => {
                      const confidence = confidenceByQuestion.get(
                        answer.question_number,
                      );
                      return (
                        <TableRow key={answer.id}>
                          <TableCell className="font-medium">
                            {answer.question_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatAnswerValue(answer.student_answer) ||
                                t("common.dash")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatAnswerValue(answer.correct_answer) ||
                                t("common.dash")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              answer={answer}
                              confidence={confidence}
                            />
                          </TableCell>
                          <TableCell>
                            {confidence
                              ? `${Math.round(confidence.confidence)}%`
                              : t("common.na")}
                          </TableCell>
                          <TableCell>{formatScore(answer.score)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
