package com.example.testmarking.template.calc;

import com.example.testmarking.template.TemplateConstants.AnswerLayoutType;
import com.example.testmarking.template.exception.TemplateException;

import java.util.Arrays;

/**
 * Server-side mirror of the designer's questionDistribution.ts. Keep both in sync.
 *
 * total  1..20 -> 2 zones, capacity 10+10
 * total 21..40 -> 4 zones, capacity 10x4
 * total 41..60 -> 4 zones, capacity 15x4
 *
 * Removed questions are taken from the last zone first, then the one before it.
 * The stored data is unchanged: still 2 or 4 answer_zones, each with its own rows.
 */
public final class QuestionDistribution {

    public static final int MIN_QUESTIONS = 1;
    public static final int MAX_QUESTIONS = 60;

    public record Result(int preset, AnswerLayoutType layout, int[] rows) {
        public int total() { return Arrays.stream(rows).sum(); }
    }

    private QuestionDistribution() {}

    public static int presetForTotal(int total) {
        if (total <= 20) return 20;
        if (total <= 40) return 40;
        return 60;
    }

    /** Throws 400 when total is outside 1..60 (the designer clamps, the API should not guess). */
    public static Result distribute(int total) {
        if (total < MIN_QUESTIONS || total > MAX_QUESTIONS) {
            throw TemplateException.badRequest("Số câu hỏi phải từ " + MIN_QUESTIONS + " đến " + MAX_QUESTIONS,
                    "total_questions=" + total);
        }
        int preset = presetForTotal(total);
        int[] capacity = switch (preset) {
            case 20 -> new int[] {10, 10};
            case 40 -> new int[] {10, 10, 10, 10};
            default -> new int[] {15, 15, 15, 15};
        };
        AnswerLayoutType layout = capacity.length == 2 ? AnswerLayoutType.TWO_ZONE : AnswerLayoutType.FOUR_ZONE;

        int toRemove = Arrays.stream(capacity).sum() - total;
        int[] rows = capacity.clone();
        for (int i = rows.length - 1; i >= 0 && toRemove > 0; i--) {
            int take = Math.min(toRemove, rows[i]);
            rows[i] -= take;
            toRemove -= take;
        }
        return new Result(preset, layout, rows);
    }
}
