import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Copy, Download, FileText, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import templateBackground from "@/imports/background_template-1.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTechnicalValue, getApiErrorMessage } from "@/lib/apiErrorMessage";
import { useTranslation } from 'react-i18next';
import i18n from "@/i18n";
import type { Template } from "@/types/academic.types";
import { OMRTemplateDesigner, type OMRTemplateDraft } from "../OMRTemplateDesigner";
import { createTemplate, deleteTemplate, getTemplates } from "../templates.api";

const PAGE_WIDTH = 827;
const PAGE_HEIGHT = 1169;
const GRID_PADDING = 5;
const NUMBER_COLUMN_RATIO = 0.12;
const NUMBER_COLUMN_MIN_WIDTH = 14;
const NUMBER_COLUMN_MAX_WIDTH = 30;
const NUMBER_COLUMN_MAX_TOTAL_RATIO = 0.32;
const BUBBLE_RATIO = 0.8;
const BUBBLE_MAX_SIZE = 25;
const BUBBLE_SIZE_DEFAULT = 18;
const MAX_SPACING = 40;
const MIN_SPACING = 4;
const ANSWER_OPTION_LABEL_GAP = 0;
const ID_LABEL_ROW_HEIGHT = 16;
const ID_WRITE_BOX_GAP = 3;
const ID_COL_GAP_AFTER_LABEL = 2;
const ID_GROUP_GAP = 12;
const DEFAULT_FIXED_ZONE_BBOX = { x: 45, y: 80, width: 339, height: 288 };
const DEFAULT_FIXED_ZONE_ITEMS = [
  { type: "full_name", enabled: true, label: "Họ và tên" },
  { type: "class_name", enabled: true, label: "Lớp" },
  { type: "subject", enabled: true, label: "Môn học" },
  { type: "exam_date", enabled: true, label: "Ngày thi" },
];

interface AnswerGridCell {
  type: "question_number" | "choice";
  questionNumber: number;
  choiceLetter?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnswerChoiceLabel {
  letter: string;
  x: number;
  y: number;
  fontSize: number;
}

interface AnswerGridLayout {
  cells: AnswerGridCell[];
  optionLabels: AnswerChoiceLabel[];
  bubbleSize: number;
  labelFontSize: number;
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
}): AnswerGridLayout {
  const { boundingBox, rows, options, hasStartNumber, hasEndNumber, startQuestionIndex } = params;
  if (rows <= 0 || options <= 0) return { cells: [], optionLabels: [], bubbleSize: 0, labelFontSize: 0 };

  const padding = Math.min(GRID_PADDING, boundingBox.width / 8, boundingBox.height / 8);
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
      ? Math.min(preferredNumberWidth * numberColumnCount, innerWidth * NUMBER_COLUMN_MAX_TOTAL_RATIO)
      : 0;
  const numberColumnWidth = numberColumnCount > 0 ? totalNumberWidth / numberColumnCount : 0;
  const startNumberWidth = hasStartNumber ? numberColumnWidth : 0;
  const endNumberWidth = hasEndNumber ? numberColumnWidth : 0;
  const choiceAreaX = innerX + startNumberWidth;
  const choiceAreaWidth = Math.max(1, innerWidth - startNumberWidth - endNumberWidth);
  const choiceStep = choiceAreaWidth / options;
  const rowStep = innerHeight / rows;
  const bubbleSize = clamp(Math.min(choiceStep, rowStep) * BUBBLE_RATIO, 4, BUBBLE_MAX_SIZE);
  const labelFontSize = clamp(Math.min(rowStep * 0.4, Math.max(numberColumnWidth, 1) * 0.45), 8, 13);
  const cells: AnswerGridCell[] = [];
  const optionLabels: AnswerChoiceLabel[] = Array.from({ length: options }, (_, optionIndex) => ({
    letter: String.fromCharCode(65 + optionIndex),
    x: choiceAreaX + (optionIndex + 0.5) * choiceStep,
    y: boundingBox.y - ANSWER_OPTION_LABEL_GAP,
    fontSize: clamp(labelFontSize, 8, 12),
  }));

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const questionNumber = startQuestionIndex + rowIndex;
    const y = innerY + (rowIndex + 0.5) * rowStep;

    if (hasStartNumber) {
      cells.push({
        type: "question_number",
        questionNumber,
        x: innerX + startNumberWidth / 2,
        y,
        width: startNumberWidth,
        height: rowStep,
      });
    }

    for (let optionIndex = 0; optionIndex < options; optionIndex++) {
      cells.push({
        type: "choice",
        questionNumber,
        choiceLetter: String.fromCharCode(65 + optionIndex),
        x: choiceAreaX + (optionIndex + 0.5) * choiceStep,
        y,
        width: choiceStep,
        height: rowStep,
      });
    }

    if (hasEndNumber) {
      cells.push({
        type: "question_number",
        questionNumber,
        x: choiceAreaX + choiceAreaWidth + endNumberWidth / 2,
        y,
        width: endNumberWidth,
        height: rowStep,
      });
    }
  }

  return { cells, optionLabels, bubbleSize, labelFontSize };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load template background image'));
    image.src = source;
  });
}

function drawImageContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function getDownloadFileName(templateName: string) {
  const safeName = templateName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);

  const baseName = safeName || translateWithFallback("templates.bank.defaultFileName", "template-omr");
  const suffix = translateWithFallback("templates.bank.fileNameSuffix", "phieu-tra-loi-omr");
  return `${baseName}-${suffix}.pdf`;
}

function translateWithFallback(key: string, fallback: string) {
  const value = i18n.t(key);
  return value === key ? fallback : value;
}

function getIdZoneLabel(type: string) {
  const labelMap: Record<string, string> = {
    student_id: translateWithFallback("omr.idLabels.studentId", "Số báo danh"),
    class_code: translateWithFallback("omr.idLabels.classCode", "Mã lớp"),
    exam_code: translateWithFallback("omr.idLabels.examCode", "Mã đề"),
    "omr.idLabels.studentId": translateWithFallback("omr.idLabels.studentId", "Số báo danh"),
    "omr.idLabels.classCode": translateWithFallback("omr.idLabels.classCode", "Mã lớp"),
    "omr.idLabels.examCode": translateWithFallback("omr.idLabels.examCode", "Mã đề"),
  };

  return labelMap[type] ?? type;
}

// ─── ID Zone Grid Layout (matching Template Designer) ────

interface IdZoneGridLayout {
  bubbleCells: { x: number; y: number; itemType: string }[];
  writeBoxCells: { x: number; y: number }[];
  rowNumberLabels: { text: string; x: number; y: number }[];
  typeLabels: { text: string; x: number; width: number; y: number }[];
  separatorXs: number[];
  separatorTopY: number;
  separatorBottomY: number;
  bubbleSize: number;
  ok: boolean;
}

interface GridLayoutResult {
  spacing: number;
  offset: number;
  ok: boolean;
}

function calculateGridLayout(
  totalWidth: number,
  numColumns: number,
  bubbleSize: number,
): GridLayoutResult {
  if (numColumns <= 0) return { spacing: 0, offset: 0, ok: false };
  if (totalWidth <= 0) return { spacing: 0, offset: 0, ok: false };
  if (numColumns === 1) {
    const offset = (totalWidth - bubbleSize) / 2;
    return { spacing: 0, offset: Math.max(0, offset), ok: offset >= 0 };
  }
  const effectiveMin = bubbleSize + MIN_SPACING;
  let spacing = (totalWidth - bubbleSize) / (numColumns - 1);
  spacing = Math.max(effectiveMin, Math.min(MAX_SPACING, spacing));
  const occupiedWidth = (numColumns - 1) * spacing + bubbleSize;
  if (occupiedWidth > totalWidth + 0.01) {
    spacing = Math.max(effectiveMin, (totalWidth - bubbleSize) / (numColumns - 1));
    const minOccupied = (numColumns - 1) * spacing + bubbleSize;
    if (minOccupied > totalWidth + 0.01) {
      return { spacing: 0, offset: 0, ok: false };
    }
  }
  const offset = (totalWidth - ((numColumns - 1) * spacing + bubbleSize)) / 2;
  return { spacing, offset: Math.max(0, offset), ok: true };
}

function calculateIdZoneGridForCanvas(gridConfig: any): IdZoneGridLayout {
  const empty: IdZoneGridLayout = {
    bubbleCells: [], writeBoxCells: [], rowNumberLabels: [],
    typeLabels: [], separatorXs: [], separatorTopY: 0, separatorBottomY: 0,
    bubbleSize: BUBBLE_SIZE_DEFAULT, ok: false,
  };

  const idZones = gridConfig.id_zones;
  if (!idZones?.bounding_box) return empty;

  const bbox = idZones.bounding_box;
  const padding = Math.min(GRID_PADDING, bbox.width / 8, bbox.height / 8);
  const effX = bbox.x + padding;
  const effY = bbox.y + padding;
  const effWidth = Math.max(1, bbox.width - padding * 2);
  const effHeight = Math.max(1, bbox.height - padding * 2);

  const items = (idZones.items ?? []) as Array<{ type: string; enabled: boolean; num_digits: number }>;
  const enabledItems = items.filter((item) => item.enabled);
  const totalColumns = enabledItems.reduce((sum, item) => sum + item.num_digits, 0);
  if (totalColumns <= 0) return empty;

  const rows = 10;

  const estimatedOverhead = ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + (BUBBLE_SIZE_DEFAULT + 4) + ID_WRITE_BOX_GAP;
  const estimatedGridH = Math.max(1, effHeight - estimatedOverhead);
  const rawDx = effWidth / totalColumns;
  const rawDy = estimatedGridH / rows;
  const bubbleSize = clamp(Math.min(rawDx, rawDy) * BUBBLE_RATIO, 4, BUBBLE_MAX_SIZE);

  const prelimHLayout = calculateGridLayout(effWidth, totalColumns, bubbleSize);
  const rowNumColW = Math.min(prelimHLayout.spacing || bubbleSize, effWidth * 0.15);
  const rowNumGap = 4;
  const groupGap = enabledItems.length > 1 ? ID_GROUP_GAP : 0;
  const totalGroupGap = Math.max(0, enabledItems.length - 1) * groupGap;
  const bubbleGridWidth = effWidth - rowNumColW - rowNumGap;
  if (bubbleGridWidth <= 0) return empty;
  const columnGridWidth = bubbleGridWidth - totalGroupGap;
  if (columnGridWidth <= 0) return empty;
  const bubbleGridX = effX + rowNumColW + rowNumGap;

  const writeBoxRowH = bubbleSize + 4;
  const topOverhead = ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + writeBoxRowH + ID_WRITE_BOX_GAP;
  const bubbleGridHeight = effHeight - topOverhead;
  if (bubbleGridHeight <= 0) return empty;
  const bubbleGridY = effY + topOverhead;

  const hLayout = calculateGridLayout(columnGridWidth, totalColumns, bubbleSize);
  const vLayout = calculateGridLayout(bubbleGridHeight, rows, bubbleSize);
  const colSpacing = (hLayout.ok && hLayout.spacing > 0) ? hLayout.spacing : columnGridWidth / totalColumns;
  const colOffsetX = (hLayout.ok && hLayout.spacing > 0) ? hLayout.offset : 0;
  const rowSpacing = (vLayout.ok && vLayout.spacing > 0) ? vLayout.spacing : bubbleGridHeight / rows;
  const rowOffsetY = (vLayout.ok && vLayout.spacing > 0) ? vLayout.offset : 0;

  const bubbleCells: { x: number; y: number; itemType: string }[] = [];
  const writeBoxCells: { x: number; y: number }[] = [];
  const rowNumberLabels: { text: string; x: number; y: number }[] = [];
  const typeLabels: { text: string; x: number; width: number; y: number }[] = [];
  const separatorXs: number[] = [];

  const rowNumCenterX = effX + rowNumColW / 2;
  for (let r = 0; r < rows; r++) {
    rowNumberLabels.push({ text: `${r}.`, x: rowNumCenterX, y: bubbleGridY + rowOffsetY + r * rowSpacing + bubbleSize / 2 });
  }

  const writeBoxY = effY + ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + writeBoxRowH / 2;
  let colIndex = 0;
  for (let itemIndex = 0; itemIndex < enabledItems.length; itemIndex++) {
    const item = enabledItems[itemIndex];
    const groupWidth = item.num_digits * colSpacing;
    const groupOffsetX = itemIndex * groupGap;
    const groupStartX = bubbleGridX + colOffsetX + groupOffsetX + colIndex * colSpacing;
    typeLabels.push({ text: getIdZoneLabel(item.type), x: groupStartX, width: groupWidth, y: effY + 2 });

    for (let d = 0; d < item.num_digits; d++) {
      const cx = bubbleGridX + colOffsetX + groupOffsetX + colIndex * colSpacing + bubbleSize / 2;
      writeBoxCells.push({ x: cx, y: writeBoxY });

      for (let r = 0; r < rows; r++) {
        bubbleCells.push({
          x: cx,
          y: bubbleGridY + rowOffsetY + r * rowSpacing + bubbleSize / 2,
          itemType: item.type,
        });
      }
      colIndex++;
    }

    if (itemIndex < enabledItems.length - 1 && colSpacing > 0) {
      separatorXs.push(bubbleGridX + colOffsetX + groupOffsetX + (colIndex - 1) * colSpacing + bubbleSize / 2 + (colSpacing + groupGap) / 2);
    }
  }

  return {
    bubbleCells, writeBoxCells, rowNumberLabels, typeLabels, separatorXs,
    separatorTopY: effY + 2,
    separatorBottomY: bubbleGridY + rowOffsetY + (rows - 1) * rowSpacing + bubbleSize,
    bubbleSize, ok: true,
  };
}

function drawFixedInfoZone(context: CanvasRenderingContext2D, gridConfig: any) {
  const source = gridConfig.fixed_zones && typeof gridConfig.fixed_zones === "object" && !Array.isArray(gridConfig.fixed_zones)
    ? gridConfig.fixed_zones
    : { bounding_box: DEFAULT_FIXED_ZONE_BBOX, items: DEFAULT_FIXED_ZONE_ITEMS };
  const bbox = source.bounding_box ?? DEFAULT_FIXED_ZONE_BBOX;
  const rawItems = Array.isArray(source.items) ? source.items : DEFAULT_FIXED_ZONE_ITEMS;
  const items = DEFAULT_FIXED_ZONE_ITEMS.map((defaultItem) => {
    const item = rawItems.find((candidate: any) => candidate?.type === defaultItem.type);
    return {
      type: defaultItem.type,
      enabled: item?.enabled ?? defaultItem.enabled,
      label: item?.label || defaultItem.label,
    };
  }).filter((item) => item.enabled);

  const padding = 5;
  const rowHeight = 30;
  const rowGap = 15;
  const labelPaddingLeft = 8;
  const startX = bbox.x + padding;
  const startY = bbox.y + padding;
  const rightX = bbox.x + bbox.width - padding;
  const lineStartX = startX + labelPaddingLeft + 92;

  context.fillStyle = "#111827";
  context.strokeStyle = "#111827";
  context.lineWidth = 1;
  context.font = "bold 14px Arial, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";

  items.forEach((item, index) => {
    const y = startY + index * (rowHeight + rowGap);
    const textX = startX + labelPaddingLeft;
    const textY = y + rowHeight / 2;
    const label = `${item.label}:`;
    context.fillText(label, textX, textY);
    context.beginPath();
    context.moveTo(lineStartX, textY + 5);
    context.lineTo(rightX, textY + 5);
    context.stroke();
  });
}

async function renderTemplateCanvas(template: Template): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error('Unable to create canvas context');
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  const backgroundImage = await loadImage(templateBackground);
  drawImageContain(context, backgroundImage, PAGE_WIDTH, PAGE_HEIGHT);
  drawFixedInfoZone(context, template.grid_config);

  // ── Render ID Zone ──────────────────────────────────────
  const idGridLayout = calculateIdZoneGridForCanvas(template.grid_config);
  if (idGridLayout.ok) {
    const b = idGridLayout.bubbleSize;

    // Row number labels
    context.fillStyle = "#9ca3af";
    context.font = "10px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const rn of idGridLayout.rowNumberLabels) {
      context.fillText(rn.text, rn.x, rn.y);
    }

    // Type labels
    context.fillStyle = "#0f766e";
    context.font = "bold 8px Arial, sans-serif";
    context.textAlign = "left";
    for (const label of idGridLayout.typeLabels) {
      context.fillText(label.text, label.x + 2, label.y + 8);
    }

    // Write boxes
    context.lineWidth = 0.8;
    context.strokeStyle = "#d1d5db";
    for (const wb of idGridLayout.writeBoxCells) {
      context.strokeRect(wb.x - b / 2, wb.y - b / 2, b, b);
    }

    // Group separators
    context.strokeStyle = "#99f6e4";
    context.lineWidth = 1;
    for (const sx of idGridLayout.separatorXs) {
      context.beginPath();
      context.moveTo(sx, idGridLayout.separatorTopY);
      context.lineTo(sx, idGridLayout.separatorBottomY);
      context.stroke();
    }

    // Bubbles
    context.lineWidth = 0.8;
    context.strokeStyle = "#0d9488";
    context.fillStyle = "#ffffff";
    for (const cell of idGridLayout.bubbleCells) {
      context.beginPath();
      context.arc(cell.x, cell.y, b / 2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  let questionStart = 1;
  for (const answerZone of template.grid_config.answer_zones ?? []) {
    const boundingBox = answerZone.bounding_box;
    const rows = Number(answerZone.layout?.rows ?? 0);
    const options = Number(answerZone.layout?.options ?? 0);
    const hasStartNumber = Boolean(answerZone.layout?.has_start_number);
    const hasEndNumber = Boolean(answerZone.layout?.has_end_number);

    if (rows <= 0 || options <= 0) continue;

    const gridLayout = calculateAnswerGridLayout({
      boundingBox,
      rows,
      options,
      hasStartNumber,
      hasEndNumber,
      startQuestionIndex: questionStart,
    });

    context.fillStyle = "#374151";
    context.font = `600 ${Math.max(8, Math.min(12, gridLayout.labelFontSize))}px "Segoe UI", Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "bottom";
    for (const label of gridLayout.optionLabels) {
      context.fillText(label.letter, label.x, label.y);
    }

    for (const cell of gridLayout.cells) {
      if (cell.type === "choice") {
        context.beginPath();
        context.arc(cell.x, cell.y, gridLayout.bubbleSize / 2, 0, Math.PI * 2);
        context.fillStyle = "#ffffff";
        context.fill();
        context.lineWidth = 1;
        context.strokeStyle = "#4b5563";
        context.stroke();
        continue;
      }

      const isStartColumn = hasStartNumber && cell.x < boundingBox.x + boundingBox.width / 2;
      const questionLabel = `${cell.questionNumber}${isStartColumn ? "." : ""}`;

      context.fillStyle = "#374151";
      context.font = `500 ${gridLayout.labelFontSize}px \"Segoe UI\", \"Arial\", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(questionLabel, cell.x, cell.y);
    }

    questionStart += rows;
  }

  return canvas;
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const imageBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.95);
  });

  if (!imageBlob) {
    throw new Error('Unable to export template as image');
  }

  return new Uint8Array(await imageBlob.arrayBuffer());
}

function createPdfFromJpeg(jpegBytes: Uint8Array, width: number, height: number): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const appendText = (value: string) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  const appendBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  const appendObject = (id: number, body: string | Uint8Array, header = "") => {
    offsets[id] = byteLength;
    appendText(`${id} 0 obj\n`);
    if (header) appendText(header);
    if (typeof body === "string") {
      appendText(body);
    } else {
      appendBytes(body);
    }
    if (header.includes("stream\n")) {
      appendText("\nendstream");
    }
    appendText("\nendobj\n");
  };

  const pageWidth = 595.28;
  const pageHeight = pageWidth * (height / width);
  const content = `q\n${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm\n/Im1 Do\nQ`;

  appendText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");
  appendObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  appendObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  appendObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(
      2,
    )}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`,
  );
  appendObject(
    4,
    jpegBytes,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  appendObject(5, content, `<< /Length ${encoder.encode(content).length} >>\nstream\n`);

  const xrefOffset = byteLength;
  appendText("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id++) {
    appendText(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blobParts: BlobPart[] = chunks.map((chunk) => {
    const buffer = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(buffer).set(chunk);
    return buffer;
  });

  return new Blob(blobParts, { type: "application/pdf" });
}

async function renderTemplateAsPdf(template: Template): Promise<Blob> {
  const canvas = await renderTemplateCanvas(template);
  const jpegBytes = await canvasToJpegBytes(canvas);
  return createPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
}

function getTemplateStats(template: Template) {
  const answerZones = template.grid_config.answer_zones ?? [];
  const totalQuestions = answerZones.reduce((sum, zone) => sum + Number(zone.layout?.rows ?? 0), 0);
  const choicesPerQuestion = Number(answerZones[0]?.layout?.options ?? 0);
  return { totalQuestions, choicesPerQuestion, zoneCount: answerZones.length };
}

export function TemplateBankPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [templates],
  );

  async function loadTemplates() {
    try {
      setIsLoading(true);
      setTemplates(await getTemplates());
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('templates.bank.loadFailed')));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function handleSaveDraft(draft: OMRTemplateDraft) {
    if (!templateName.trim()) {
      toast.error(t('templates.bank.requiredName'));
      return;
    }

    try {
      setIsSaving(true);
      const created = await createTemplate({
        name: templateName.trim(),
        anchor_points: draft.anchor_points,
        grid_config: draft.grid_config,
      });
      setTemplates((current) => [created, ...current]);
      setTemplateName("");
      setIsCreating(false);
      toast.success(t('templates.bank.created'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('templates.bank.createFailed')));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyTemplate(template: Template) {
    try {
      const copied = await createTemplate({
        name: t('templates.bank.copyName', { name: template.name }),
        anchor_points: template.anchor_points,
        grid_config: template.grid_config,
        template_type: template.template_type,
      });
      setTemplates((current) => [copied, ...current]);
      toast.success(t('templates.bank.copied'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('templates.bank.copyFailed')));
    }
  }

  async function handleDeleteTemplate(template: Template) {
    try {
      await deleteTemplate(template.id);
      setTemplateToDelete(null);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      toast.success(t('templates.bank.deleted'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('templates.bank.deleteFailed')));
    }
  }

  async function handleDownloadTemplate(template: Template) {
    try {
      const pdfBlob = await renderTemplateAsPdf(template);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getDownloadFileName(template.name || "template-omr");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('templates.bank.renderError')));
    }
  }

  if (isCreating) {
    return (
      <div className="space-y-4">
        <div className="shrink-0 border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('templates.bank.create')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('templates.bank.createDesc')}</p>
          </div>
          <Button variant="outline" onClick={() => setIsCreating(false)} disabled={isSaving}>
            {t('templates.bank.cancel')}
          </Button>
          </div>
          <div className="mt-4 max-w-xl space-y-2">
            <Label htmlFor="template-name">{t('templates.bank.nameLabel')}</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder={t('templates.bank.namePlaceholder')}
            />
          </div>
        </div>
        <OMRTemplateDesigner
          embedded
          saveLabel={t('templates.bank.saveLabel')}
          saving={isSaving}
          onSave={handleSaveDraft}
        />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{t('templates.bank.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('templates.bank.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void loadTemplates()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {t('templates.bank.reload')}
          </Button>
          <Button
            variant="success"
            className="gap-2"
            onClick={() => {
              setTemplateName("");
              setIsCreating(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('templates.bank.createNew')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedTemplates.map((template) => {
          const stats = getTemplateStats(template);
          return (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-soft text-brand-soft-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{formatTechnicalValue(template.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">{t('templates.bank.cards.questions')}</div>
                    <div className="mt-1 font-semibold text-foreground">{stats.totalQuestions}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">{t('templates.bank.cards.choices')}</div>
                    <div className="mt-1 font-semibold text-foreground">{stats.choicesPerQuestion}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-muted-foreground">{t('templates.bank.cards.zones')}</div>
                    <div className="mt-1 font-semibold text-foreground">{stats.zoneCount}</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-1">
                  <Link to={`/templates/${template.id}/edit`}>
                    <Button variant="ghost" size="icon" title={t('templates.bank.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={t('templates.bank.copyJson')}
                    onClick={() => void handleCopyTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={t('templates.bank.downloadPdf')}
                    onClick={() => void handleDownloadTemplate(template)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={t('templates.bank.delete')}
                    onClick={() => setTemplateToDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!isLoading && sortedTemplates.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed bg-card p-10 text-center text-muted-foreground">
            {t('templates.bank.emptyMessage')}
          </div>
        )}
      </div>
    </div>
      <Dialog open={Boolean(templateToDelete)} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.bank.deleteTitle', { defaultValue: 'Xóa template?' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {templateToDelete ? t('templates.bank.deleteConfirm', { name: templateToDelete.name }) : null}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateToDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => templateToDelete && void handleDeleteTemplate(templateToDelete)}
            >
              {t('common.delete', { defaultValue: 'Xóa' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
