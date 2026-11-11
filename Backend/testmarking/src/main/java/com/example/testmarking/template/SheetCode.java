package com.example.testmarking.template;

/**
 * The "mã phiếu" printed on every answer sheet and on the exam paper: the template id with at least two digits.
 * 1 -> "01", 9 -> "09", 12 -> "12", 123 -> "123" (a leading zero is only added to a single digit).
 */
public final class SheetCode {

    private SheetCode() {}

    public static String of(Long templateId) {
        if (templateId == null) return null;
        return templateId < 10 ? "0" + templateId : String.valueOf(templateId);
    }
}
