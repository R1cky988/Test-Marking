import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, FileText, Maximize2, Plus, Save, ZoomIn, ZoomOut } from "lucide-react";

import templateBackground from "@/imports/background_template-1.png";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import type { CreateTemplatePayload, OmrAnchorPoint, OmrAnswerZone, OmrBoundingBox, OmrFixedZoneItem, OmrFixedZones, OmrGridConfig, OmrIdZone, OmrIdZoneItem, Template } from "@/types/academic.types";
import { createTemplate, getTemplate, updateTemplate } from "./templates.api";
import { ANSWER_PRESETS, MAX_QUESTIONS, MIN_QUESTIONS, clampTotal, distributeQuestions } from "./questionDistribution";

type LayoutType = "2zones" | "4zones" | null;

interface ZoneConfig {
  rows: string;
  options: string;
  showNumberStart: boolean;
  showNumberEnd: boolean;
  configured: boolean;
}

export interface OMRTemplateDraft {
  anchor_points: OmrAnchorPoint[];
  grid_config: OmrGridConfig;
  total_questions: number;
  choices_per_question: number;
}

interface OMRTemplateDesignerProps {
  embedded?: boolean;
  saveLabel?: string;
  saving?: boolean;
  onSave?: (draft: OMRTemplateDraft) => void | Promise<void>;
}

const PAGE_WIDTH = 827;
const PAGE_HEIGHT = 1169;
const GRID_PADDING = 5;
const NUMBER_COLUMN_RATIO = 0.12;
const NUMBER_COLUMN_MIN_WIDTH = 14;
const NUMBER_COLUMN_MAX_WIDTH = 30;
const NUMBER_COLUMN_MAX_TOTAL_RATIO = 0.32;
const BUBBLE_RATIO = 0.8;
const BUBBLE_MAX_SIZE = 25;
const BUBBLE_WARNING_SIZE = 8;
const ANSWER_OPTION_LABEL_GAP = 0;

/** Spacing constraints for grid layout (shared with backend) */
const MAX_SPACING = 40;
const MIN_SPACING = 4;
const BUBBLE_SIZE_DEFAULT = 18;

/** Default ID zone bounding box */
const DEFAULT_ID_ZONE_BBOX: OmrBoundingBox = { x: 389, y: 80, width: 418, height: 288 };

/** Default fixed info zone */
const DEFAULT_FIXED_ZONE_BBOX: OmrBoundingBox = { x: 45, y: 80, width: 339, height: 288 };
const DEFAULT_FIXED_ZONE_ITEMS: OmrFixedZoneItem[] = [
  { type: "full_name", enabled: true, label: "Họ và tên" },
  { type: "class_name", enabled: true, label: "Lớp" },
  { type: "subject", enabled: true, label: "Môn học" },
  { type: "exam_date", enabled: true, label: "Ngày thi" },
];

/** Default ID zone items */
const DEFAULT_ID_ZONE_ITEMS: OmrIdZoneItem[] = [
  { type: "student_id", enabled: true, num_digits: 8 },
  { type: "class_code", enabled: true, num_digits: 5 },
  { type: "exam_code", enabled: true, num_digits: 3 },
];

/** Student codes are HSxxxxxxxx and exam codes use 3 cells: both are fixed, always on. */
const FIXED_ID_DIGITS: Record<string, number> = { student_id: 8, exam_code: 3 };

function lockIdZoneItems(items: OmrIdZoneItem[]): OmrIdZoneItem[] {
  const byType = new Map(items.map((item) => [item.type, item]));
  return DEFAULT_ID_ZONE_ITEMS.map((def) => {
    const fixed = FIXED_ID_DIGITS[def.type];
    const current = byType.get(def.type) ?? def;
    return fixed ? { ...current, enabled: true, num_digits: fixed } : current;
  });
}

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

const defaultZoneConfig: ZoneConfig = {
  rows: "",
  options: "4",
  showNumberStart: true,
  showNumberEnd: false,
  configured: false,
};

const defaultAnchorPoints: OmrAnchorPoint[] = [
  { id: 1, abs_x: 45, abs_y: 45, u: 45 / PAGE_WIDTH, v: 45 / PAGE_HEIGHT },
  { id: 2, abs_x: 782, abs_y: 45, u: 782 / PAGE_WIDTH, v: 45 / PAGE_HEIGHT },
  { id: 3, abs_x: 782, abs_y: 1124, u: 782 / PAGE_WIDTH, v: 1124 / PAGE_HEIGHT },
  { id: 4, abs_x: 45, abs_y: 1124, u: 45 / PAGE_WIDTH, v: 1124 / PAGE_HEIGHT },
  { id: 5, abs_x: 45, abs_y: 403, u: 45 / PAGE_WIDTH, v: 403 / PAGE_HEIGHT },
  { id: 6, abs_x: 414, abs_y: 403, u: 414 / PAGE_WIDTH, v: 403 / PAGE_HEIGHT },
  { id: 7, abs_x: 782, abs_y: 403, u: 782 / PAGE_WIDTH, v: 403 / PAGE_HEIGHT },
  { id: 8, abs_x: 782, abs_y: 763, u: 782 / PAGE_WIDTH, v: 763 / PAGE_HEIGHT },
  { id: 9, abs_x: 414, abs_y: 763, u: 414 / PAGE_WIDTH, v: 763 / PAGE_HEIGHT },
  { id: 10, abs_x: 45, abs_y: 763, u: 45 / PAGE_WIDTH, v: 763 / PAGE_HEIGHT },
  { id: 11, abs_x: 414, abs_y: 1124, u: 414 / PAGE_WIDTH, v: 1124 / PAGE_HEIGHT },
  { id: 12, abs_x: 414, abs_y: 45, u: 414 / PAGE_WIDTH, v: 45 / PAGE_HEIGHT },
];

const zoneCoordinates = {
  "2zones": [
    { x: 90, y: 408, width: 279, height: 723 },
    { x: 457, y: 408, width: 279, height: 723 },
  ],
  "4zones": [
    { x: 90, y: 408, width: 279, height: 350 },
    { x: 457, y: 408, width: 279, height: 350 },
    { x: 90, y: 768, width: 279, height: 350 },
    { x: 457, y: 768, width: 279, height: 350 },
  ],
};

function getZoneCount(layout: LayoutType) {
  if (layout === "2zones") return 2;
  if (layout === "4zones") return 4;
  return 0;
}

function getLayoutFromTemplate(template: Template): Exclude<LayoutType, null> | null {
  const zoneCount = template.grid_config.answer_zones.length;
  if (zoneCount === 2) return "2zones";
  if (zoneCount === 4) return "4zones";
  return null;
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

  const choiceAreaWidth = Math.max(1, innerWidth - startNumberWidth - endNumberWidth);
  const rowStep = innerHeight / rows;
  const bubbleSize = clamp(Math.min(choiceAreaWidth / options, rowStep) * BUBBLE_RATIO, 4, BUBBLE_MAX_SIZE);
  const choiceAreaX = innerX + startNumberWidth;
  const choiceStep = choiceAreaWidth / options;

  const labelFontSize = clamp(Math.min(rowStep * 0.4, Math.max(numberColumnWidth, 1) * 0.45), 8, 13);
  const cells: AnswerGridCell[] = [];
  const optionLabels: AnswerChoiceLabel[] = [];

  for (let optionIndex = 0; optionIndex < options; optionIndex++) {
    optionLabels.push({
      letter: String.fromCharCode(65 + optionIndex),
      x: choiceAreaX + (optionIndex + 0.5) * choiceStep,
      y: boundingBox.y - ANSWER_OPTION_LABEL_GAP,
      fontSize: clamp(labelFontSize, 8, 12),
    });
  }

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
      const x = choiceAreaX + (optionIndex + 0.5) * choiceStep;
      cells.push({
        type: "choice",
        questionNumber,
        choiceLetter: String.fromCharCode(65 + optionIndex),
        x,
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

// --- Grid Layout Utility (spacing + centering) --------------

interface GridLayoutResult {
  spacing: number;
  offset: number;
  ok: boolean;
  error?: string;
}

/**
 * Calculate column spacing and centering offset for a grid zone.
 *
 * With N columns, distributes N bubbles evenly within the available width W.
 * - spacing = distance between centers of adjacent columns
 * - offset  = distance from left edge to center of first column (= right edge to last column)
 *
 * Constraints: MIN_SPACING <= spacing <= MAX_SPACING, offset >= 0.
 */
function calculateGridLayout(
  totalWidth: number,
  numColumns: number,
  bubbleSize: number,
): GridLayoutResult {
  if (numColumns <= 0) {
    return { spacing: 0, offset: 0, ok: false, error: "numColumns must be >= 1" };
  }
  if (totalWidth <= 0) {
    return { spacing: 0, offset: 0, ok: false, error: "totalWidth must be > 0" };
  }

  // Single column: just center it
  if (numColumns === 1) {
    const offset = (totalWidth - bubbleSize) / 2;
    if (offset < 0) {
      return { spacing: 0, offset: 0, ok: false, error: "Bubble does not fit in zone width" };
    }
    return { spacing: 0, offset, ok: true };
  }

  // Gap between bubble edges must be at least MIN_SPACING
  // => center-to-center distance must be at least bubbleSize + MIN_SPACING
  const effectiveMin = bubbleSize + MIN_SPACING;

  // Ideal spacing: distribute evenly
  let spacing = (totalWidth - bubbleSize) / (numColumns - 1);

  // Clamp to [effectiveMin, MAX_SPACING]
  spacing = Math.max(effectiveMin, Math.min(MAX_SPACING, spacing));

  // Total width occupied by all columns
  const occupiedWidth = (numColumns - 1) * spacing + bubbleSize;

  if (occupiedWidth > totalWidth + 0.01) {
    // Not enough room - reduce spacing down to effectiveMin
    spacing = Math.max(effectiveMin, (totalWidth - bubbleSize) / (numColumns - 1));
    const minOccupied = (numColumns - 1) * spacing + bubbleSize;
    if (minOccupied > totalWidth + 0.01) {
      return {
        spacing: 0,
        offset: 0,
        ok: false,
        error: i18n.t("omr.errors.notEnoughSpace", {
          needed: Math.ceil(minOccupied),
          available: Math.ceil(totalWidth),
        }),
      };
    }
  }

  const offset = (totalWidth - ((numColumns - 1) * spacing + bubbleSize)) / 2;

  return { spacing, offset: Math.max(0, offset), ok: true };
}

// --- ID Zone Grid Calculation -------------------------------

const ID_LABEL_ROW_HEIGHT = 16; // px for type labels like "Student ID"
const ID_WRITE_BOX_GAP = 3; // gap above/below writing boxes
const ID_COL_GAP_AFTER_LABEL = 2; // small gap between label row and write-box row
const ID_GROUP_GAP = 12; // visual gap between ID groups

interface IdZoneGridCell {
  itemType: "student_id" | "class_code" | "exam_code";
  columnIndex: number;
  /** 0..9 = bubble row; -1 = write-box row */
  rowIndex: number;
  x: number;
  y: number;
}

interface IdZoneGridLayout {
  /** Bubble cells (rowIndex 0..9) */
  bubbleCells: IdZoneGridCell[];
  /** Writing box cells (rowIndex -1) - one per column */
  writeBoxCells: IdZoneGridCell[];
  /** Row-number label Y positions (10 rows) */
  rowNumberLabels: { text: string; x: number; y: number }[];
  /** Label positions for each enabled ID type */
  typeLabels: { text: string; x: number; width: number; y: number }[];
  /** X positions for separators between ID groups */
  separatorXs: number[];
  separatorTopY: number;
  separatorBottomY: number;
  bubbleSize: number;
  colSpacing: number;
  rowSpacing: number;
  /** Offset of first bubble column center from grid-left (after row-number col) */
  offsetBubbleX: number;
  /** Offset of first bubble row center from grid-top (after labels + write-boxes) */
  offsetBubbleY: number;
  /** X where the bubble grid starts (bbox.x + padding + rowNumberColWidth + gap) */
  bubbleGridX: number;
  /** Y where the bubble grid starts */
  bubbleGridY: number;
  ok: boolean;
  error?: string;
}

function calculateIdZoneGrid(
  bbox: OmrBoundingBox,
  items: OmrIdZoneItem[],
): IdZoneGridLayout {
  const empty: IdZoneGridLayout = {
    bubbleCells: [],
    writeBoxCells: [],
    rowNumberLabels: [],
    typeLabels: [],
    separatorXs: [],
    separatorTopY: bbox.y,
    separatorBottomY: bbox.y,
    bubbleSize: BUBBLE_SIZE_DEFAULT,
    colSpacing: 0,
    rowSpacing: 0,
    offsetBubbleX: 0,
    offsetBubbleY: 0,
    bubbleGridX: bbox.x,
    bubbleGridY: bbox.y,
    ok: false,
    error: undefined as string | undefined,
  };

  const padding = Math.min(GRID_PADDING, bbox.width / 8, bbox.height / 8);
  const effX = bbox.x + padding;
  const effY = bbox.y + padding;
  const effWidth = Math.max(1, bbox.width - padding * 2);
  const effHeight = Math.max(1, bbox.height - padding * 2);
  const rows = 10;

  const enabledItems = items.filter((item) => item.enabled);
  const totalColumns = enabledItems.reduce((sum, item) => sum + item.num_digits, 0);

  if (totalColumns <= 0) {
    return { ...empty, error: i18n.t("omr.errors.enableAtLeastOneId") };
  }

  // -- Estimate bubble size ----------------------------------
  const estimatedOverhead = ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + (BUBBLE_SIZE_DEFAULT + 4) + ID_WRITE_BOX_GAP;
  const estimatedGridH = Math.max(1, effHeight - estimatedOverhead);
  const rawDx = effWidth / totalColumns;
  const rawDy = estimatedGridH / rows;
  const bubbleSize = clamp(Math.min(rawDx, rawDy) * BUBBLE_RATIO, 4, BUBBLE_MAX_SIZE);

  // -- Horizontal subdivision --------------------------------
  // Row-number column width = 1 bubble column (from preliminary spacing)
  const prelimHLayout = calculateGridLayout(effWidth, totalColumns, bubbleSize);
  const rowNumColW = Math.min(prelimHLayout.spacing || bubbleSize, effWidth * 0.15);
  const rowNumGap = 4;
  const groupGap = enabledItems.length > 1 ? ID_GROUP_GAP : 0;
  const totalGroupGap = Math.max(0, enabledItems.length - 1) * groupGap;
  const bubbleGridWidth = effWidth - rowNumColW - rowNumGap;
  if (bubbleGridWidth <= 0) {
    return { ...empty, error: i18n.t("omr.errors.idZoneWidth") };
  }
  const columnGridWidth = bubbleGridWidth - totalGroupGap;
  if (columnGridWidth <= 0) {
    return { ...empty, error: i18n.t("omr.errors.idZoneWidth") };
  }
  const bubbleGridX = effX + rowNumColW + rowNumGap;

  // -- Vertical subdivision ----------------------------------
  const writeBoxRowH = bubbleSize + 4;
  const topOverhead = ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + writeBoxRowH + ID_WRITE_BOX_GAP;
  const bubbleGridHeight = effHeight - topOverhead;
  if (bubbleGridHeight <= 0) {
    return { ...empty, error: i18n.t("omr.errors.idZoneHeight") };
  }
  const bubbleGridY = effY + topOverhead;

  // Spacing + centering (fallback to even division like answer zones)
  const hLayout = calculateGridLayout(columnGridWidth, totalColumns, bubbleSize);
  const vLayout = calculateGridLayout(bubbleGridHeight, rows, bubbleSize);

  const colSpacing = (hLayout.ok && hLayout.spacing > 0) ? hLayout.spacing : columnGridWidth / totalColumns;
  const colOffsetX = (hLayout.ok && hLayout.spacing > 0) ? hLayout.offset : 0;
  const rowSpacing = (vLayout.ok && vLayout.spacing > 0) ? vLayout.spacing : bubbleGridHeight / rows;
  const rowOffsetY = (vLayout.ok && vLayout.spacing > 0) ? vLayout.offset : 0;

  // -- Build cells -------------------------------------------
  const bubbleCells: IdZoneGridCell[] = [];
  const writeBoxCells: IdZoneGridCell[] = [];
  const rowNumberLabels: { text: string; x: number; y: number }[] = [];
  const typeLabels: { text: string; x: number; width: number; y: number }[] = [];
  const separatorXs: number[] = [];

  // Digit labels (0..9) centered in the left column
  const rowNumCenterX = effX + rowNumColW / 2;
  for (let r = 0; r < rows; r++) {
    const y = bubbleGridY + rowOffsetY + r * rowSpacing + bubbleSize / 2;
    rowNumberLabels.push({ text: `${r}.`, x: rowNumCenterX, y });
  }

  // Type labels (one per ID type group, centered over its columns)
  const writeBoxY = effY + ID_LABEL_ROW_HEIGHT + ID_COL_GAP_AFTER_LABEL + writeBoxRowH / 2;

  let colIndex = 0;
  for (let itemIndex = 0; itemIndex < enabledItems.length; itemIndex++) {
    const item = enabledItems[itemIndex];
    const groupCols = item.num_digits;
    const groupWidth = groupCols * colSpacing;
    const groupOffsetX = itemIndex * groupGap;
    const groupStartX = bubbleGridX + colOffsetX + groupOffsetX + colIndex * colSpacing;

    const labelText =
      item.type === "student_id"
        ? i18n.t("omr.idLabels.studentId")
        : item.type === "class_code"
          ? i18n.t("omr.idLabels.classCode")
          : i18n.t("omr.idLabels.examCode");
    typeLabels.push({
      text: labelText,
      x: groupStartX,
      width: groupWidth,
      y: effY + 2,
    });

    for (let d = 0; d < item.num_digits; d++) {
      const cx = bubbleGridX + colOffsetX + groupOffsetX + colIndex * colSpacing + bubbleSize / 2;

      // Write box
      writeBoxCells.push({
        itemType: item.type,
        columnIndex: colIndex,
        rowIndex: -1,
        x: cx,
        y: writeBoxY,
      });

      // Bubbles (10 rows)
      for (let r = 0; r < rows; r++) {
        const cy = bubbleGridY + rowOffsetY + r * rowSpacing + bubbleSize / 2;
        bubbleCells.push({
          itemType: item.type,
          columnIndex: colIndex,
          rowIndex: r,
          x: cx,
          y: cy,
        });
      }

      colIndex++;
    }

    // Separator line between groups
    if (itemIndex < enabledItems.length - 1 && colSpacing > 0) {
      const boundaryX = bubbleGridX + colOffsetX + groupOffsetX + (colIndex - 1) * colSpacing + bubbleSize / 2 + (colSpacing + groupGap) / 2;
      separatorXs.push(boundaryX);
    }
  }

  return {
    bubbleCells,
    writeBoxCells,
    rowNumberLabels,
    typeLabels,
    separatorXs,
    separatorTopY: effY + 2,
    separatorBottomY: bubbleGridY + rowOffsetY + (rows - 1) * rowSpacing + bubbleSize,
    bubbleSize,
    colSpacing,
    rowSpacing,
    offsetBubbleX: colOffsetX,
    offsetBubbleY: rowOffsetY,
    bubbleGridX,
    bubbleGridY,
    ok: true,
  };
}

function normalizeFixedZoneItems(value: unknown): OmrFixedZoneItem[] {
  const rawItems =
    value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as OmrFixedZones).items)
      ? (value as OmrFixedZones).items
      : DEFAULT_FIXED_ZONE_ITEMS;

  return DEFAULT_FIXED_ZONE_ITEMS.map((defaultItem) => {
    const item = rawItems.find((candidate) => candidate.type === defaultItem.type);
    return {
      type: defaultItem.type,
      enabled: item?.enabled ?? defaultItem.enabled,
      label: item?.label || defaultItem.label,
    };
  });
}

function calculateFixedInfoRows(items: OmrFixedZoneItem[]) {
  const padding = 5;
  const rowHeight = 30;
  const rowGap = 15;
  const labelPaddingLeft = 8;
  const bbox = DEFAULT_FIXED_ZONE_BBOX;
  const startX = bbox.x + padding;
  const startY = bbox.y + padding;
  const rightX = bbox.x + bbox.width - padding;
  const lineStartX = startX + labelPaddingLeft + 92;

  return items
    .filter((item) => item.enabled)
    .map((item, index) => {
      const y = startY + index * (rowHeight + rowGap);
      const labelX = startX + labelPaddingLeft;
      const textTop = y + 9;
      const textBaselineY = textTop + 14;
      return {
        item,
        x: labelX,
        y,
        textTop,
        rowHeight,
        underlineX: lineStartX,
        underlineY: textBaselineY,
        underlineWidth: Math.max(1, rightX - lineStartX),
      };
    });
}

export function OMRTemplateDesigner({
  embedded = false,
  saveLabel,
  saving = false,
  onSave,
}: OMRTemplateDesignerProps) {
  const { t } = useTranslation();
  const resolvedSaveLabel = saveLabel ?? t("omr.save");
  const navigate = useNavigate();
  const { id, templateId } = useParams();
  const isEditMode = Boolean(templateId) && !onSave;
  const [templateName, setTemplateName] = useState("");
  // The teacher picks a 20/40/60 preset, then may type any total (1..60).
  // Layout (2 or 4 zones) and rows per zone are derived from the total.
  const [answerCount, setAnswerCount] = useState<number | null>(null);
  const [answerCountInput, setAnswerCountInput] = useState("");
  const distribution = useMemo(() => (answerCount ? distributeQuestions(answerCount) : null), [answerCount]);
  const selectedLayout: LayoutType = distribution?.layout ?? null;
  // Editing may change the sheet size too (e.g. 20 -> 40 answers): the layout is derived from the total again.
  // The server only lets a template that no exam uses be edited, so nothing printed can be put out of line by it.
  const [originalLayout, setOriginalLayout] = useState<Exclude<LayoutType, null> | null>(null);
  const allowedRange = { min: MIN_QUESTIONS, max: MAX_QUESTIONS };
  const [zones, setZones] = useState<ZoneConfig[]>([
    { ...defaultZoneConfig },
    { ...defaultZoneConfig },
    { ...defaultZoneConfig },
    { ...defaultZoneConfig },
  ]);
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isSavingRouteTemplate, setIsSavingRouteTemplate] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isIdZoneActive, setIsIdZoneActive] = useState(false);
  const [isFixedZoneActive, setIsFixedZoneActive] = useState(false);

  // ID zone state
  const [idZoneItems, setIdZoneItems] = useState<OmrIdZoneItem[]>([...DEFAULT_ID_ZONE_ITEMS]);
  const [fixedZoneItems, setFixedZoneItems] = useState<OmrFixedZoneItem[]>([...DEFAULT_FIXED_ZONE_ITEMS]);

  const numZones = getZoneCount(selectedLayout);
  const activeCoordinates = selectedLayout ? zoneCoordinates[selectedLayout] : [];

  const totalQuestions = useMemo(
    () => zones.slice(0, numZones).reduce((sum, zone) => sum + (Number.parseInt(zone.rows, 10) || 0), 0),
    [numZones, zones],
  );

  // Push the derived rows into the zone state (rows are read-only in the UI).
  useEffect(() => {
    if (!distribution) return;
    setZones((current) =>
      current.map((zone, index) => {
        const rows = distribution.rows[index];
        if (rows === undefined) return { ...defaultZoneConfig };
        return { ...zone, rows: String(rows), configured: true };
      }),
    );
  }, [distribution]);

  function applyAnswerCount(raw: number) {
    const next = Math.min(allowedRange.max, Math.max(allowedRange.min, clampTotal(raw)));
    setAnswerCount(next);
    setAnswerCountInput(String(next));
    setActiveZone(0);
    setIsFixedZoneActive(false);
    setIsIdZoneActive(false);
  }

  useEffect(() => {
    if (!templateId || onSave) return;

    async function loadTemplateForEdit() {
      try {
        setIsLoadingTemplate(true);
        const template = await getTemplate(templateId);
        const layout = getLayoutFromTemplate(template);

        if (!layout) {
          toast.error(t("omr.errors.layoutInvalid"));
          navigate("/templates");
          return;
        }

        setTemplateName(template.name);
        setOriginalLayout(layout);
        {
          const saved = template.grid_config.answer_zones.reduce((sum, zone) => sum + zone.layout.rows, 0);
          const total = clampTotal(saved);
          setAnswerCount(total);
          setAnswerCountInput(String(total));
        }
        setActiveZone(0);
        setFixedZoneItems(normalizeFixedZoneItems(template.grid_config.fixed_zones));
        setIdZoneItems(lockIdZoneItems(template.grid_config.id_zones?.items?.length ? template.grid_config.id_zones.items : [...DEFAULT_ID_ZONE_ITEMS]));
        setZones((current) =>
          current.map((zone, index) => {
            const answerZone = template.grid_config.answer_zones[index];
            if (!answerZone) return { ...defaultZoneConfig };

            return {
              rows: String(answerZone.layout.rows),
              options: String(answerZone.layout.options),
              showNumberStart: answerZone.layout.has_start_number,
              showNumberEnd: answerZone.layout.has_end_number,
              configured: true,
            };
          }),
        );
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("omr.errors.loadFailed")));
        navigate("/templates");
      } finally {
        setIsLoadingTemplate(false);
      }
    }

    void loadTemplateForEdit();
  }, [navigate, onSave, templateId]);

  function updateZone(index: number, field: keyof ZoneConfig, value: ZoneConfig[keyof ZoneConfig]) {
    setZones((current) =>
      current.map((zone, currentIndex) =>
        currentIndex === index ? { ...zone, [field]: value } : zone,
      ),
    );
  }

  function updateZoneOptions(index: number, rawValue: string) {
    if (!rawValue) {
      updateZone(index, "options", rawValue);
      return;
    }

    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value)) return;
    updateZone(index, "options", String(Math.max(2, Math.min(5, value))));
  }

  function updateIdZoneItem(index: number, patch: Partial<OmrIdZoneItem>) {
    setIdZoneItems((current) =>
      lockIdZoneItems(
        current.map((item, currentIndex) =>
          currentIndex === index ? { ...item, ...patch } : item,
        ),
      ),
    );
  }

  function updateFixedZoneItem(index: number, patch: Partial<OmrFixedZoneItem>) {
    setFixedZoneItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function calculateQuestionRange(zoneIndex: number): string {
    const start = zones
      .slice(0, zoneIndex)
      .reduce((sum, zone) => sum + (Number.parseInt(zone.rows, 10) || 0), 1);
    const rows = Number.parseInt(zones[zoneIndex].rows, 10) || 0;
    return rows > 0 ? `${i18n.t("omr.question")} ${start} - ${start + rows - 1}` : i18n.t("omr.notConfigured");
  }

  function isFormValid() {
    if (!selectedLayout) return false;
    const usedZones = zones.slice(0, numZones);
    if (usedZones.reduce((sum, zone) => sum + (Number.parseInt(zone.rows, 10) || 0), 0) <= 0) return false;
    if (!usedZones.every((zone) => (Number.parseInt(zone.rows, 10) || 0) >= 0)) return false;
    if (!usedZones.every((zone) => {
      const options = Number.parseInt(zone.options, 10);
      return options >= 2 && options <= 6;
    })) return false;
    const firstOptions = usedZones[0]?.options;
    return usedZones.every((zone) => zone.options === firstOptions);
  }

  function buildDraft(): OMRTemplateDraft {
    if (!selectedLayout) {
      throw new Error("Layout is required");
    }

    const answerZones: OmrAnswerZone[] = activeCoordinates.map((coord, index) => ({
      zone_id: `answer_zone_${index + 1}`,
      type: "multiple_choice_grid",
      bounding_box: coord,
      layout: {
        rows: Number.parseInt(zones[index].rows, 10) || 0,
        options: Number.parseInt(zones[index].options, 10),
        has_start_number: zones[index].showNumberStart,
        has_end_number: zones[index].showNumberEnd,
      },
    }));

    const idZone: OmrIdZone = {
      bounding_box: DEFAULT_ID_ZONE_BBOX,
      items: idZoneItems.map((item) => ({ ...item })),
    };
    const fixedZones: OmrFixedZones = {
      bounding_box: DEFAULT_FIXED_ZONE_BBOX,
      items: fixedZoneItems.map((item) => ({ ...item })),
    };

    return {
      anchor_points: defaultAnchorPoints,
      grid_config: {
        anchor_points: defaultAnchorPoints,
        fixed_zones: fixedZones,
        id_zones: idZone,
        answer_zones: answerZones,
      },
      total_questions: answerZones.reduce((sum, zone) => sum + zone.layout.rows, 0),
      choices_per_question: answerZones[0]?.layout.options ?? 4,
    };
  }

  async function handleSaveTemplate() {
    if (!isFormValid()) {
      toast.error(t("omr.errors.invalidConfig"));
      return;
    }

    const draft = buildDraft();
    const idGridWarning = calculateIdZoneGrid(DEFAULT_ID_ZONE_BBOX, idZoneItems);
    const smallBubbleZones = draft.grid_config.answer_zones
      .map((zone, index) => ({
        index,
        bubbleSize: calculateAnswerGridLayout({
          boundingBox: zone.bounding_box,
          rows: zone.layout.rows,
          options: zone.layout.options,
          hasStartNumber: zone.layout.has_start_number,
          hasEndNumber: zone.layout.has_end_number,
          startQuestionIndex: draft.grid_config.answer_zones
            .slice(0, index)
            .reduce((sum, item) => sum + item.layout.rows, 1),
        }).bubbleSize,
      }))
      .filter((item) => item.bubbleSize > 0 && item.bubbleSize < BUBBLE_WARNING_SIZE);

    if (idGridWarning.ok && idGridWarning.bubbleSize < BUBBLE_WARNING_SIZE) {
      toast.warning(
        t("omr.warnings.idBubbleSmall", {
          size: idGridWarning.bubbleSize.toFixed(1),
          minSize: BUBBLE_WARNING_SIZE,
        }),
      );
    }

    if (smallBubbleZones.length > 0) {
      toast.warning(
        t("omr.warnings.answerZoneBubbleSmall", {
          count: smallBubbleZones.length,
          minSize: BUBBLE_WARNING_SIZE,
        }),
      );
    }

    if (onSave) {
      await onSave(draft);
      return;
    }

    if (!templateName.trim()) {
      toast.error(t("omr.errors.nameRequired"));
      return;
    }

    const payload: CreateTemplatePayload = {
      name: templateName.trim(),
      anchor_points: draft.anchor_points,
      grid_config: draft.grid_config,
    };

    try {
      setIsSavingRouteTemplate(true);
      if (isEditMode && templateId) {
        await updateTemplate(templateId, payload);
        toast.success(t("omr.toasts.updated"));
        navigate("/templates");
        return;
      }

      await createTemplate(payload);
      toast.success(t("omr.toasts.saved"));
      navigate(id ? `/exams/${id}/edit` : "/templates");
    } catch (error) {
      toast.error(getApiErrorMessage(error, isEditMode ? t("omr.errors.updateFailed") : t("omr.errors.saveFailed")));
    } finally {
      setIsSavingRouteTemplate(false);
    }
  }

  const designer = (
    <div
      className={
        embedded
          ? "flex min-w-0 rounded-md border bg-muted/40 max-lg:flex-col"
          : "flex min-w-0 flex-col bg-muted/40"
      }
    >
      {!embedded && (
        <div className="border-b bg-card px-6 py-4">
          <Link
            to={id ? `/exams/${id}/edit` : "/templates"}
            className="mb-3 inline-flex items-center gap-2 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("omr.back")}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{isEditMode ? t("omr.editTitle") : t("omr.createTitle")}</h1>
        </div>
      )}

      <div className={embedded ? "flex min-w-0 flex-1 max-lg:flex-col" : "flex min-w-0 flex-1"}>
        <div className="w-[380px] shrink-0 border-r bg-card max-lg:w-full max-lg:border-b max-lg:border-r-0">
          <div className="space-y-5 p-5">
            {isLoadingTemplate && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{t("omr.loading")}</div>
            )}

            {!onSave && (
              <div className="space-y-2">
                <Label htmlFor="template-name">{t("omr.nameLabel")}</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder={t("omr.namePlaceholder")}
                  className="focus-visible:ring-0"
                />
              </div>
            )}

            <div className="space-y-3">
              <Label>{t("omr.presetLabel")}</Label>
              <div className="grid grid-cols-3 gap-3">
                {ANSWER_PRESETS.map((preset) => {
                  const shape = distributeQuestions(preset);
                  const selected = answerCount === preset;
                  const disabled = false;
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={disabled}
                      onClick={() => applyAnswerCount(preset)}
                      className={`relative rounded-md border-2 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/60 ${
                        selected ? "border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-200 dark:bg-blue-950/40 dark:ring-blue-800" : "border-border/70 bg-card"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-white" />
                        </span>
                      )}
                      <div className="mb-2 grid aspect-[3/4] place-items-center rounded bg-blue-50">
                        <div className="grid grid-cols-2 gap-1">
                          {shape.rows.map((_, index) => (
                            <div
                              key={index}
                              className={shape.layout === "2zones" ? "h-16 w-10 rounded bg-blue-200" : "h-8 w-10 rounded bg-blue-200"}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-foreground">{t("omr.presetAnswers", { count: preset })}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("omr.presetDetail", { zones: shape.rows.length, rows: shape.rows[0] })}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-questions">{t("omr.totalQuestionsLabel")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="total-questions"
                    type="number"
                    min={allowedRange.min}
                    max={allowedRange.max}
                    disabled={answerCount === null}
                    value={answerCountInput}
                    onChange={(event) => {
                      setAnswerCountInput(event.target.value);
                      const value = Number.parseInt(event.target.value, 10);
                      if (!Number.isNaN(value) && value >= allowedRange.min && value <= allowedRange.max) {
                        setAnswerCount(value);
                      }
                    }}
                    onBlur={() => {
                      const value = Number.parseInt(answerCountInput, 10);
                      applyAnswerCount(Number.isNaN(value) ? (answerCount ?? allowedRange.max) : value);
                    }}
                    className="border-border bg-card focus-visible:border-primary focus-visible:ring-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("omr.totalQuestionsHint", { min: MIN_QUESTIONS, max: MAX_QUESTIONS })}
                </p>
                {isEditMode && originalLayout && selectedLayout && originalLayout !== selectedLayout && (
                  <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    {t("omr.layoutChangeNote", {
                      from: getZoneCount(originalLayout),
                      to: getZoneCount(selectedLayout),
                      defaultValue: "Cỡ phiếu thay đổi ({{from}} khu → {{to}} khu): các vùng trả lời sẽ được bố trí lại theo cỡ mới. Mẫu chưa dùng trong kỳ thi nào nên việc này an toàn; phiếu đã in trước đó sẽ không còn khớp.",
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className={selectedLayout ? "space-y-3" : "pointer-events-none space-y-3 opacity-50"}>
              <div className="flex items-center justify-between">
                <Label>{t("omr.zoneConfig")}</Label>
                <Badge variant="outline">{t("omr.questionCount", { count: totalQuestions })}</Badge>
              </div>

              {selectedLayout && (
                <Accordion
                  type="single"
                  collapsible
                  value={isFixedZoneActive ? "fixed-zone" : isIdZoneActive ? "id-zone" : activeZone !== null ? `zone-${activeZone}` : undefined}
                  onValueChange={(value) => {
                    if (value === "fixed-zone") {
                      setIsFixedZoneActive(true);
                      setIsIdZoneActive(false);
                      setActiveZone(null);
                      return;
                    }

                    if (value === "id-zone") {
                      setIsFixedZoneActive(false);
                      setIsIdZoneActive(true);
                      setActiveZone(null);
                      return;
                    }

                    setIsFixedZoneActive(false);
                    setIsIdZoneActive(false);
                    setActiveZone(value ? Number.parseInt(value.split("-")[1], 10) : null);
                  }}
                >
                  <AccordionItem value="fixed-zone">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="flex flex-wrap items-center gap-2">
                        <span>Vùng thông tin</span>
                        {fixedZoneItems
                          .filter((item) => item.enabled)
                          .map((item) => (
                            <Badge key={item.type} variant="secondary" className="text-xs">
                              {item.label}
                            </Badge>
                          ))}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {fixedZoneItems.map((item, idx) => (
                          <div key={item.type} className="rounded-md border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <Label className="text-sm font-medium">{item.label}</Label>
                              <Switch
                                checked={item.enabled}
                                onCheckedChange={(checked) => updateFixedZoneItem(idx, { enabled: checked })}
                              />
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-xs text-muted-foreground">Nhãn hiển thị</Label>
                              <Input
                                value={item.label}
                                disabled={!item.enabled}
                                onChange={(event) => updateFixedZoneItem(idx, { label: event.target.value })}
                                className="h-8"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="id-zone">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{t("omr.idZone")}</span>
                        {idZoneItems
                          .filter((item) => item.enabled)
                          .map((item) => (
                            <Badge key={item.type} variant="secondary" className="text-xs">
                              {item.type === "student_id" ? t("omr.studentCodeShort") : item.type === "class_code" ? t("omr.classCode") : t("omr.examCode")}: {item.num_digits}
                            </Badge>
                          ))}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {idZoneItems.map((item, idx) => {
                          const label =
                            item.type === "student_id"
                              ? t("omr.studentId")
                              : item.type === "class_code"
                                ? t("omr.classCode")
                                : t("omr.examCode");

                          const locked = item.type in FIXED_ID_DIGITS;

                          return (
                            <div key={item.type} className="rounded-md border p-3">
                              <div className="flex items-center justify-between gap-3">
                                <Label className="text-sm font-medium">{label}</Label>
                                <Switch
                                  checked={item.enabled}
                                  disabled={locked}
                                  onCheckedChange={(checked) => updateIdZoneItem(idx, { enabled: checked })}
                                />
                              </div>
                              {locked && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {t("omr.idFixedHint", {
                                    defaultValue: item.type === "student_id"
                                      ? "Cố định 8 chữ số (mã học sinh dạng HSxxxxxxxx)."
                                      : "Cố định 3 ô cho mã đề.",
                                  })}
                                </p>
                              )}
                              <div className="mt-3 space-y-2">
                                <Label className="text-xs text-muted-foreground">{t("omr.digitsLabel")}</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={item.num_digits}
                                  disabled={!item.enabled || locked}
                                  onChange={(event) => {
                                    if (locked) return;
                                    const value = Number.parseInt(event.target.value, 10) || 1;
                                    updateIdZoneItem(idx, { num_digits: Math.max(1, Math.min(10, value)) });
                                  }}
                                  className="h-8 border-border bg-card focus-visible:border-primary focus-visible:ring-0"
                                />
                              </div>
                            </div>
                          );
                        })}

                        {(() => {
                          const idGridLayout = calculateIdZoneGrid(DEFAULT_ID_ZONE_BBOX, idZoneItems);
                          if (idGridLayout.ok) return null;
                          return (
                            <div className="flex items-start gap-2 rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-foreground">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{idGridLayout.error || t("omr.errors.layoutInvalid")}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {Array.from({ length: numZones }, (_, index) => (
                    <AccordionItem key={index} value={`zone-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <span className="flex items-center gap-2">
                          <span>{t("omr.zone", { num: index + 1 })}</span>
                          <Badge variant="outline" className="text-xs">
                            {calculateQuestionRange(index)}
                          </Badge>
                          {zones[index].configured && <Badge className="bg-green-100 text-green-800">{t("omr.ok")}</Badge>}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <Label htmlFor={`rows-${index}`}>{t("omr.rowsLabel")}</Label>
                            <Input
                              id={`rows-${index}`}
                              type="number"
                              value={zones[index].rows}
                              readOnly
                              disabled
                              className="border-border bg-card focus-visible:border-primary focus-visible:ring-0"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`options-${index}`}>{t("omr.choicesLabel")}</Label>
                            <Input
                              id={`options-${index}`}
                              type="number"
                              min="2"
                              max="5"
                              value={zones[index].options}
                              onChange={(event) => updateZoneOptions(index, event.target.value)}
                              onBlur={() => updateZoneOptions(index, zones[index].options || "4")}
                              className="border-border bg-card focus-visible:border-primary focus-visible:ring-0"
                            />
                            <p className="text-xs text-muted-foreground">{t("omr.choicesRangeHint")}</p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <Label htmlFor={`start-${index}`} className="text-sm font-normal">
                                {t("omr.showStartNumber")}
                              </Label>
                              <Switch
                                id={`start-${index}`}
                                checked={zones[index].showNumberStart}
                                onCheckedChange={(checked) => updateZone(index, "showNumberStart", checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label htmlFor={`end-${index}`} className="text-sm font-normal">
                                {t("omr.showEndNumber")}
                              </Label>
                              <Switch
                                id={`end-${index}`}
                                checked={zones[index].showNumberEnd}
                                onCheckedChange={(checked) => updateZone(index, "showNumberEnd", checked)}
                              />
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={(Number.parseInt(zones[index].rows, 10) || 0) < 0}
                            onClick={() => {
                              updateZone(index, "configured", true);
                              setActiveZone(null);
                            }}
                          >
                            {t("omr.apply")}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              disabled={!isFormValid() || saving || isSavingRouteTemplate || isLoadingTemplate}
              onClick={() => void handleSaveTemplate()}
            >
              <Save className="h-4 w-4" />
              {saving || isSavingRouteTemplate ? t("omr.saving") : isEditMode ? t("omr.update") : resolvedSaveLabel}
            </Button>
          </div>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col bg-muted max-lg:min-h-[520px]">
          {!selectedLayout ? (
            <div className="grid flex-1 place-items-center text-center text-muted-foreground">
              <div>
                <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/70" />
                <p className="font-medium">{t("omr.noLayout")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-md border bg-card p-1 shadow">
                <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="w-12 text-center text-sm font-medium text-muted-foreground">{zoom}%</div>
                <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(150, zoom + 10))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setZoom(100)}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 sm:p-8">
                <div className="flex justify-center">
                  <div
                    className="relative overflow-hidden bg-white shadow-2xl"
                    style={{
                      width: `${PAGE_WIDTH}px`,
                      height: `${PAGE_HEIGHT}px`,
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <img src={templateBackground} alt={t("omr.templateAlt")} className="absolute inset-0 h-full w-full object-contain" />

                    {/* Fixed Info Zone Rendering */}
                    {(() => {
                      const bbox = DEFAULT_FIXED_ZONE_BBOX;
                      const rows = calculateFixedInfoRows(fixedZoneItems);
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setIsFixedZoneActive(true);
                            setIsIdZoneActive(false);
                            setActiveZone(null);
                          }}
                          className={`absolute cursor-pointer border-2 border-amber-500/60 bg-transparent hover:bg-amber-50/10 ${
                            isFixedZoneActive ? "ring-2 ring-blue-500" : ""
                          }`}
                          style={{
                            left: bbox.x,
                            top: bbox.y,
                            width: bbox.width,
                            height: bbox.height,
                          }}
                          title="Cấu hình vùng thông tin"
                        >
                          {rows.map((row) => (
                            <span key={row.item.type} className="contents">
                              <span
                                className="absolute whitespace-nowrap text-[14px] font-bold leading-none text-zinc-900"
                                style={{
                                  left: row.x - bbox.x,
                                  top: row.textTop - bbox.y,
                                }}
                              >
                                {row.item.label}:
                              </span>
                              <span
                                className="absolute border-b border-zinc-900"
                                style={{
                                  left: row.underlineX - bbox.x,
                                  top: row.underlineY - bbox.y,
                                  width: row.underlineWidth,
                                  height: 1,
                                }}
                              />
                            </span>
                          ))}
                        </button>
                      );
                    })()}

                    {/* ID Zone Rendering */}
                    {(() => {
                      const idGridLayout = calculateIdZoneGrid(DEFAULT_ID_ZONE_BBOX, idZoneItems);
                      const isIdBubbleTooSmall =
                        idGridLayout.ok && idGridLayout.bubbleSize < BUBBLE_WARNING_SIZE;

                      const bbox = DEFAULT_ID_ZONE_BBOX;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setIsFixedZoneActive(false);
                            setIsIdZoneActive(true);
                            setActiveZone(null);
                          }}
                          className={`absolute border-2 border-teal-500/60 bg-transparent cursor-pointer hover:bg-teal-50/10 ${
                            isIdZoneActive ? "ring-2 ring-blue-500" : ""
                          }`}
                          style={{
                            left: bbox.x,
                            top: bbox.y,
                            width: bbox.width,
                            height: bbox.height,
                          }}
                          title={t("omr.clickToConfigId")}
                        >
                          {/* Warning for invalid layout */}
                          {!idGridLayout.ok && (
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700 z-10">
                              <AlertTriangle className="h-3 w-3" />
                              {idGridLayout.error || t("omr.errors.layoutInvalid")}
                            </span>
                          )}

                          {idGridLayout.ok && (
                            <>
                              {isIdBubbleTooSmall && (
                                <span className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 shadow-sm">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("omr.bubbleTooSmall", { size: idGridLayout.bubbleSize.toFixed(1) })}
                                </span>
                              )}
                              {/* Type labels */}
                              {idGridLayout.typeLabels.map((label, i) => (
                                <span
                                  key={`label-${i}`}
                                  className="absolute overflow-hidden text-left text-[10px] font-semibold leading-tight text-teal-700"
                                  style={{
                                    left: label.x - bbox.x + 2,
                                    top: label.y - bbox.y,
                                    width: Math.max(1, label.width - 4),
                                    height: ID_LABEL_ROW_HEIGHT,
                                  }}
                                >
                                  {label.text}
                                </span>
                              ))}

                              {/* Digit labels (0..9) */}
                              {idGridLayout.rowNumberLabels.map((rn, i) => (
                                <span
                                  key={`rn-${i}`}
                                  className="absolute text-center text-[11px] font-medium text-zinc-500"
                                  style={{
                                    left: rn.x - bbox.x - 10,
                                    top: rn.y - bbox.y - 7,
                                    width: 20,
                                    height: 14,
                                    lineHeight: "14px",
                                  }}
                                >
                                  {rn.text}
                                </span>
                              ))}

                              {/* Group separators */}
                              {idGridLayout.separatorXs.map((sx, i) => (
                                <span
                                  key={`sep-${i}`}
                                  className="absolute bg-teal-200/70"
                                  style={{
                                    left: sx - bbox.x - 0.5,
                                    top: idGridLayout.separatorTopY - bbox.y,
                                    width: 1,
                                    height: idGridLayout.separatorBottomY - idGridLayout.separatorTopY,
                                  }}
                                />
                              ))}

                              {/* Writing boxes */}
                              {idGridLayout.writeBoxCells.map((cell, idx) => (
                                <span
                                  key={`wb-${idx}`}
                                  className="absolute border border-zinc-300 bg-white"
                                  style={{
                                    left: cell.x - bbox.x - idGridLayout.bubbleSize / 2,
                                    top: cell.y - bbox.y - idGridLayout.bubbleSize / 2,
                                    width: idGridLayout.bubbleSize,
                                    height: idGridLayout.bubbleSize,
                                  }}
                                />
                              ))}

                              {/* Bubbles */}
                              {idGridLayout.bubbleCells.map((cell, idx) => (
                                <span
                                  key={`b-${idx}`}
                                  className="absolute rounded-full border border-teal-500 bg-white"
                                  style={{
                                    left: cell.x - bbox.x - idGridLayout.bubbleSize / 2,
                                    top: cell.y - bbox.y - idGridLayout.bubbleSize / 2,
                                    width: idGridLayout.bubbleSize,
                                    height: idGridLayout.bubbleSize,
                                  }}
                                />
                              ))}
                            </>
                          )}
                        </button>
                      );
                    })()}

                    {activeCoordinates.map((coord, index) => {
                      const zone = zones[index];
                      const rows = Number.parseInt(zone.rows, 10) || 0;
                      const options = Number.parseInt(zone.options, 10) || 4;
                      const isActive = activeZone === index;
                      const startQuestionIndex =
                        zones.slice(0, index).reduce((sum, item) => sum + (Number.parseInt(item.rows, 10) || 0), 1);
                      const gridLayout = calculateAnswerGridLayout({
                        boundingBox: coord,
                        rows,
                        options,
                        hasStartNumber: zone.showNumberStart,
                        hasEndNumber: zone.showNumberEnd,
                        startQuestionIndex,
                      });
                      const isBubbleTooSmall =
                        gridLayout.bubbleSize > 0 && gridLayout.bubbleSize < BUBBLE_WARNING_SIZE;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setActiveZone(index);
                            setIsFixedZoneActive(false);
                            setIsIdZoneActive(false);
                          }}
                          className={`absolute border-2 ${
                            rows > 0 ? "border-blue-500 bg-blue-50/10" : "border-dashed border-zinc-300 bg-white/20"
                          } ${isActive ? "ring-2 ring-blue-500" : ""}`}
                          style={{ left: coord.x, top: coord.y, width: coord.width, height: coord.height }}
                        >
                          {rows === 0 ? (
                            <span className="flex h-full flex-col items-center justify-center gap-2 text-sm font-medium text-zinc-800">
                              <span className="grid h-10 w-10 place-items-center rounded-full border bg-white">
                                <Plus className="h-5 w-5" />
                              </span>
                              {t("omr.zone", { num: index + 1 })}
                            </span>
                          ) : (
                            <span className="absolute inset-0">
                              {isBubbleTooSmall && (
                                <span className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 shadow-sm">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t("omr.bubbleSizeLabel", { size: gridLayout.bubbleSize.toFixed(1) })}
                                </span>
                              )}
                              {gridLayout.optionLabels.map((label) => (
                                <span
                                  key={`label-${label.letter}`}
                                  className="absolute text-center font-semibold leading-none text-zinc-800"
                                  style={{
                                    left: label.x - coord.x - 10,
                                    top: label.y - coord.y - label.fontSize,
                                    width: 20,
                                    fontSize: label.fontSize,
                                  }}
                                >
                                  {label.letter}
                                </span>
                              ))}
                              {gridLayout.cells.map((cell, cellIndex) =>
                                cell.type === "choice" ? (
                                  <span
                                    key={cellIndex}
                                    className="absolute rounded-full border border-zinc-700 bg-white"
                                    title={t("omr.choiceTooltip", {
                                      question: cell.questionNumber,
                                      choice: cell.choiceLetter,
                                    })}
                                    style={{
                                      left: cell.x - coord.x - gridLayout.bubbleSize / 2,
                                      top: cell.y - coord.y - gridLayout.bubbleSize / 2,
                                      width: gridLayout.bubbleSize,
                                      height: gridLayout.bubbleSize,
                                    }}
                                  />
                                ) : (
                                  <span
                                    key={cellIndex}
                                    className="absolute text-center font-medium leading-none text-zinc-800"
                                    style={{
                                      left: cell.x - coord.x - cell.width / 2,
                                      top: cell.y - coord.y - cell.height / 2,
                                      width: cell.width,
                                      height: cell.height,
                                      fontSize: gridLayout.labelFontSize,
                                      lineHeight: `${cell.height}px`,
                                    }}
                                  >
                                    {cell.questionNumber}
                                    {zone.showNumberStart && cell.x < coord.x + coord.width / 2 ? "." : ""}
                                  </span>
                                ),
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return designer;
}
