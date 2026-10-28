package com.example.testmarking.application.imp;

import com.example.testmarking.adapter.rest.dtos.request.QuestionRequest;
import com.example.testmarking.domain.entities.enums.QuestionDifficulty;
import com.example.testmarking.domain.entities.enums.QuestionType;
import com.example.testmarking.template.exception.TemplateException;

import java.util.*;

/**
 * Validation of one question, shared by the form (create / update) and the Excel import so both obey the same rules.
 * Text is LaTeX-friendly plain text: it is stored exactly as typed ($x^2$, $$\frac{a}{b}$$) and rendered by the browser.
 */
final class QuestionRules {

    static final int MIN_OPTIONS = 2;
    static final int MAX_OPTIONS = 5;
    static final int MAX_CONTENT = 20_000;
    static final int MAX_OPTION = 5_000;

    private QuestionRules() {}

    /** A question that passed validation: options in order A, B, C...; correct = the labels of the right answers. */
    record Clean(String content, String explanation, List<String> options, QuestionType type,
                 SortedSet<String> correct, QuestionDifficulty difficulty) {}

    static String label(int index) {
        return String.valueOf((char) ('A' + index));
    }

    static Clean clean(QuestionRequest r) {
        if (r == null) throw bad("Thiếu dữ liệu câu hỏi", "body: is required");

        String content = trim(r.content());
        if (content.isEmpty()) throw bad("Nội dung câu hỏi không được để trống", "content: is required");
        if (content.length() > MAX_CONTENT) throw bad("Nội dung câu hỏi quá dài (tối đa " + MAX_CONTENT + " ký tự)", "content: too long");

        String explanation = trim(r.explanation());
        if (explanation.length() > MAX_CONTENT) throw bad("Lời giải quá dài (tối đa " + MAX_CONTENT + " ký tự)", "explanation: too long");

        List<String> options = new ArrayList<>();
        if (r.options() != null) for (String o : r.options()) options.add(trim(o));
        // trailing empty boxes of the form are not options; an empty box in the middle is an error
        while (!options.isEmpty() && options.get(options.size() - 1).isEmpty()) options.remove(options.size() - 1);
        if (options.size() < MIN_OPTIONS) throw bad("Cần ít nhất " + MIN_OPTIONS + " đáp án", "options: at least " + MIN_OPTIONS);
        if (options.size() > MAX_OPTIONS) throw bad("Tối đa " + MAX_OPTIONS + " đáp án", "options: at most " + MAX_OPTIONS);
        for (int i = 0; i < options.size(); i++) {
            if (options.get(i).isEmpty()) throw bad("Đáp án " + label(i) + " đang để trống", "options[" + i + "]: is empty");
            if (options.get(i).length() > MAX_OPTION) throw bad("Đáp án " + label(i) + " quá dài", "options[" + i + "]: too long");
        }

        SortedSet<String> correct = new TreeSet<>();
        if (r.correctAnswers() != null) {
            for (String c : r.correctAnswers()) {
                String l = trim(c).toUpperCase(Locale.ROOT);
                if (l.isEmpty()) continue;
                if (l.length() != 1 || l.charAt(0) < 'A' || l.charAt(0) >= 'A' + options.size()) {
                    throw bad("Đáp án đúng \"" + c + "\" không có trong danh sách đáp án", "correct_answers: unknown label " + c);
                }
                correct.add(l);
            }
        }
        if (correct.isEmpty()) throw bad("Hãy chọn ít nhất một đáp án đúng", "correct_answers: at least 1");

        QuestionType type = parseType(r.questionType(), correct.size());
        if (type == QuestionType.SINGLE && correct.size() != 1) {
            throw bad("Câu một đáp án chỉ được có đúng 1 đáp án đúng", "correct_answers: exactly 1 for SINGLE");
        }

        QuestionDifficulty difficulty = parseDifficulty(r.difficulty());

        return new Clean(content, explanation.isEmpty() ? null : explanation, List.copyOf(options), type, correct,
                difficulty);
    }

    /** null / blank -> MEDIUM. Accepts easy|medium|hard in any case (also Vietnamese: dễ, trung bình, khó). */
    static QuestionDifficulty parseDifficulty(String s) {
        String k = key(s);
        if (k.isEmpty()) return QuestionDifficulty.MEDIUM;
        return switch (k) {
            case "easy", "de" -> QuestionDifficulty.EASY;
            case "medium", "trungbinh", "tb" -> QuestionDifficulty.MEDIUM;
            case "hard", "kho" -> QuestionDifficulty.HARD;
            default -> throw bad("Độ khó không hợp lệ: " + s, "difficulty: easy | medium | hard");
        };
    }

    /** null / blank -> inferred from the number of correct answers. */
    static QuestionType parseType(String s, int correctCount) {
        String k = key(s);
        if (k.isEmpty()) return correctCount > 1 ? QuestionType.MULTIPLE : QuestionType.SINGLE;
        return switch (k) {
            case "single", "motdapan" -> QuestionType.SINGLE;
            case "multiple", "nhieudapan" -> QuestionType.MULTIPLE;
            default -> throw bad("Loại câu hỏi không hợp lệ: " + s, "question_type: SINGLE | MULTIPLE");
        };
    }

    /** The options as a JSON array text, e.g. ["a","b"] (stored in the jsonb cache column). */
    static String optionsJson(List<String> options) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < options.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append('"');
            for (char c : options.get(i).toCharArray()) {
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> { if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c); }
                }
            }
            sb.append('"');
        }
        return sb.append(']').toString();
    }

    private static String trim(String s) {
        return s == null ? "" : s.replace(' ', ' ').trim();
    }

    static String key(String s) {
        return s == null ? "" : java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static TemplateException bad(String message, String detail) {
        return TemplateException.badRequestWithCode("INVALID_QUESTION", message, detail);
    }
}
