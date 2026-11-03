import { describe, expect, it } from "vitest";
import { exportRows, scoreText, type ResultRow } from "../examsSpring.api";

const row = (o: Partial<ResultRow>): ResultRow => ({
  id: "r", student_id: "s", student_code: "HS00000001", full_name: "Nguyen A", test_code: "418", total_correct: 3, total_questions: 4, total_score: 7.5,
  is_violation: false, violation_reason: null, has_image: false, source: "TEACHER_OFFLINE", status: "SUCCESS", submitted_at: null, ...o,
});

describe("export rows", () => {
  it("keeps code, version, right answers and score", () => {
    expect(exportRows([row({})])).toEqual([{ code: "HS00000001", name: "Nguyen A", version: "418", correct: 3, questions: 4, score: 7.5, violation: "" }]);
  });
  it("flags a violation with its reason", () => {
    expect(exportRows([row({ is_violation: true, violation_reason: "Dùng tài liệu", total_score: 0, total_correct: 0 })])[0].violation).toBe("Dùng tài liệu");
    expect(exportRows([row({ is_violation: true })])[0].violation).toBe("Vi phạm");
  });
  it("shows a dash for a missing score", () => {
    expect(scoreText(null)).toBe("—");
    expect(scoreText(7.5)).toBe("7,5");
  });
});
