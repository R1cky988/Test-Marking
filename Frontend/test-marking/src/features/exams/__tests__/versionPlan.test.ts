import { describe, expect, it } from "vitest";
import { checkVersionPlan, formatNeedsTemplate, templateQuestionTotal } from "../examsSpring.api";

const bank = { easy: 10, medium: 10, hard: 5 };

describe("checkVersionPlan", () => {
  it("accepts a plan that fits the bank and the sheet", () => {
    expect(checkVersionPlan({ count: 3, easy: 4, medium: 4, hard: 2 }, bank, 20)).toEqual([]);
  });
  it("allows FEWER questions than the sheet, blocks MORE", () => {
    expect(checkVersionPlan({ count: 1, easy: 2, medium: 2, hard: 1 }, bank, 20)).toEqual([]);
    expect(checkVersionPlan({ count: 1, easy: 10, medium: 10, hard: 5 }, bank, 20)).toContain("EXCEED_TEMPLATE");
    expect(checkVersionPlan({ count: 1, easy: 10, medium: 10, hard: 0 }, bank, 20)).toEqual([]);
  });
  it("needs enough questions of each level in the bank", () => {
    expect(checkVersionPlan({ count: 1, easy: 11, medium: 11, hard: 6 }, bank, null)).toEqual(["NOT_ENOUGH_EASY", "NOT_ENOUGH_MEDIUM", "NOT_ENOUGH_HARD"]);
  });
  it("validates count and empty plans", () => {
    expect(checkVersionPlan({ count: 0, easy: 0, medium: 0, hard: 0 }, bank, null)).toEqual(["COUNT", "EMPTY"]);
    expect(checkVersionPlan({ count: 21, easy: 1, medium: 0, hard: 0 }, bank, null)).toEqual(["COUNT"]);
    expect(checkVersionPlan({ count: 1, easy: -1, medium: 3, hard: 0 }, bank, null)).toContain("NEGATIVE");
  });
  it("online exams have no sheet limit", () => {
    expect(checkVersionPlan({ count: 1, easy: 10, medium: 10, hard: 5 }, bank, null)).toEqual([]);
  });
});

describe("formats and templates", () => {
  it("only OFFLINE and SUBMIT need a sheet", () => {
    expect([formatNeedsTemplate("OFFLINE"), formatNeedsTemplate("SUBMIT"), formatNeedsTemplate("ONLINE")]).toEqual([true, true, false]);
  });
  it("sums the rows of the answer zones", () => {
    expect(templateQuestionTotal({ answer_zones: [{ layout: { rows: 10 } }, { layout: { rows: 10 } }] })).toBe(20);
    expect(templateQuestionTotal(undefined)).toBe(0);
  });
});
