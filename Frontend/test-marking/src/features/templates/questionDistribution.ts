/**
 * Preset-based question distribution for the OMR template designer.
 *
 * The teacher picks a preset (20 / 40 / 60 answers) and may then type any total from 1 to 60.
 * The total decides the layout and the rows of each zone:
 *
 *   total  1..20  -> 2 zones, capacity 10 + 10
 *   total 21..40  -> 4 zones, capacity 10 + 10 + 10 + 10
 *   total 41..60  -> 4 zones, capacity 15 + 15 + 15 + 15
 *
 * Questions removed from a full preset are taken from the LAST zone first, then the one
 * before it, and so on. Examples: 55 -> 15/15/15/10, 45 -> 15/15/15/0, 35 -> 10/10/10/5,
 * 40 -> 10/10/10/10 (the 40 preset), 15 -> 10/5.
 *
 * The saved data does not change: the result is still 2 or 4 answer_zones with a `rows`
 * value each. This rule is mirrored in Java (QuestionDistribution) - keep both in sync.
 */

export const ANSWER_PRESETS = [20, 40, 60] as const;
export type AnswerPreset = (typeof ANSWER_PRESETS)[number];

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 60;

export type AnswerLayout = "2zones" | "4zones";

interface PresetShape {
  layout: AnswerLayout;
  /** full capacity of each zone, in order */
  capacity: number[];
}

const PRESET_SHAPES: Record<AnswerPreset, PresetShape> = {
  20: { layout: "2zones", capacity: [10, 10] },
  40: { layout: "4zones", capacity: [10, 10, 10, 10] },
  60: { layout: "4zones", capacity: [15, 15, 15, 15] },
};

export function clampTotal(total: number): number {
  if (!Number.isFinite(total)) return MIN_QUESTIONS;
  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.trunc(total)));
}

/** Smallest preset that can hold `total` answers. */
export function presetForTotal(total: number): AnswerPreset {
  const n = clampTotal(total);
  if (n <= 20) return 20;
  if (n <= 40) return 40;
  return 60;
}

export interface QuestionDistribution {
  preset: AnswerPreset;
  layout: AnswerLayout;
  /** rows per zone; length is 2 or 4 and the sum equals the (clamped) total */
  rows: number[];
}

export function distributeQuestions(total: number): QuestionDistribution {
  const n = clampTotal(total);
  const preset = presetForTotal(n);
  const { layout, capacity } = PRESET_SHAPES[preset];

  let toRemove = capacity.reduce((sum, c) => sum + c, 0) - n;
  const rows = [...capacity];
  for (let i = rows.length - 1; i >= 0 && toRemove > 0; i--) {
    const take = Math.min(toRemove, rows[i]);
    rows[i] -= take;
    toRemove -= take;
  }
  return { preset, layout, rows };
}

/**
 * When editing a saved template the server keeps the zone count locked, so the total may only
 * move inside the range of the original layout: 1..20 for 2 zones, 21..60 for 4 zones.
 */
export function totalRangeForLayout(layout: AnswerLayout): { min: number; max: number } {
  return layout === "2zones" ? { min: MIN_QUESTIONS, max: 20 } : { min: 21, max: MAX_QUESTIONS };
}
