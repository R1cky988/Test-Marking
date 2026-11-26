import { useEffect, useRef } from "react";

import {
  calculateAnswerGridLayout,
  calculateIdZoneGrid,
  PAGE_HEIGHT,
  PAGE_WIDTH,
} from "@/features/templates/OMRTemplateDesigner";
import type { OmrGridConfig } from "@/types/academic.types";
import type { ResultAnswer } from "../examsSpring.api";

const RIGHT = "#00b050";
const WRONG = "#ff1f3d";
const MISSED = "#ffc000";
const ID_PICK = "#0066ff";
/** the ring sits on the printed bubble: its radius is the layout bubble radius, a little inside so the stroke does not spill over the print */
const RING_FIT = 0.95;

const split = (v: string | null | undefined) => (v ?? "").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number, fill: boolean) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * The student's straightened sheet (827 x 1169 sheet units, scaled to the picture) with the marking drawn on it:
 * green = chosen and right, red = chosen and wrong, yellow = the right answer that was not chosen, blue = the digits of the codes.
 * The positions come from the template the exam uses (the same layout formulas the template designer draws with), the answers from the
 * result, so it works for every OFFLINE / SUBMIT paper that has a picture, and follows the answers when the teacher edits them.
 * When the picture is not a straightened sheet (wrong proportions) nothing is drawn and [onUnusable] is called.
 */
export function MarkedSheetImage({ src, gridConfig, answers, studentCode, testCode, alt, onUnusable }: {
  src: string;
  gridConfig: OmrGridConfig;
  answers: ResultAnswer[];
  studentCode?: string | null;
  testCode?: string | null;
  alt: string;
  onUnusable?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      // a straightened sheet has the proportions of the template page; a raw photo does not and the circles would miss the bubbles
      if (!w || !h || Math.abs(w / h - PAGE_WIDTH / PAGE_HEIGHT) > 0.03) { onUnusable?.(); return; }
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) { onUnusable?.(); return; }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const sx = w / PAGE_WIDTH;
      const sy = h / PAGE_HEIGHT;
      const sr = Math.min(sx, sy);
      const lineW = Math.max(1.5, 1.6 * sr);

      // codes: the digits the server stored for this paper
      const items = (gridConfig.id_zones?.items ?? []).filter((i) => i.enabled);
      if (gridConfig.id_zones && items.length > 0) {
        const grid = calculateIdZoneGrid(gridConfig.id_zones.bounding_box, gridConfig.id_zones.items);
        if (grid.ok) {
          const digits: Record<string, string> = {
            student_id: (studentCode ?? "").replace(/^HS/i, ""),
            exam_code: testCode ?? "",
          };
          const starts = new Map<string, number>();
          let col = 0;
          for (const item of items) { starts.set(item.type, col); col += item.num_digits; }
          for (const cell of grid.bubbleCells) {
            const start = starts.get(cell.itemType) ?? 0;
            const digit = (digits[cell.itemType] ?? "")[cell.columnIndex - start];
            if (digit !== undefined && Number(digit) === cell.rowIndex) {
              ring(ctx, cell.x * sx, cell.y * sy, (grid.bubbleSize / 2) * sr * RING_FIT, ID_PICK, lineW, true);
            }
          }
        }
      }

      // answers
      const byOrder = new Map(answers.map((a) => [a.order, a]));
      let running = 1;
      for (const zone of gridConfig.answer_zones ?? []) {
        const rows = zone.layout?.rows ?? 0;
        const options = zone.layout?.options ?? 0;
        const layout = calculateAnswerGridLayout({
          boundingBox: zone.bounding_box,
          rows,
          options,
          hasStartNumber: !!zone.layout?.has_start_number,
          hasEndNumber: !!zone.layout?.has_end_number,
          startQuestionIndex: zone.layout?.start_question_index ?? running,
        });
        running += rows;
        for (const cell of layout.cells) {
          if (cell.type !== "choice" || !cell.choiceLetter) continue;
          const a = byOrder.get(cell.questionNumber);
          if (!a) continue;
          const picked = split(a.choice).includes(cell.choiceLetter);
          const right = split(a.correct_answer).includes(cell.choiceLetter);
          const x = cell.x * sx;
          const y = cell.y * sy;
          const r = (layout.bubbleSize / 2) * sr * RING_FIT;
          if (picked && right) ring(ctx, x, y, r, RIGHT, lineW, true);
          else if (picked) ring(ctx, x, y, r, WRONG, lineW, true);
          else if (right) ring(ctx, x, y, r, MISSED, lineW, false);
        }
      }
    };
    img.onerror = () => { if (!cancelled) onUnusable?.(); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, gridConfig, answers, studentCode, testCode, onUnusable]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={alt}
      className="max-h-[70vh] w-full cursor-zoom-in rounded-xl border object-contain"
      onClick={() => ref.current?.toBlob((b) => { if (b) window.open(URL.createObjectURL(b), "_blank"); }, "image/jpeg", 0.92)}
    />
  );
}
