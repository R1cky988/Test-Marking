package com.example.testmarking.template.exception;

import java.util.List;

/**
 * Error with the same envelope as the NestJS original:
 * { "error": { "code": "...", "message": "...", "details": [...] } }.
 * Mapped to an HTTP status by TemplateExceptionHandler.
 */
public class TemplateException extends RuntimeException {

    public enum Kind { BAD_REQUEST, NOT_FOUND, FORBIDDEN }

    private final Kind kind;
    private final String code;
    private final List<String> details;

    public TemplateException(Kind kind, String code, String message, List<String> details) {
        super(message);
        this.kind = kind;
        this.code = code;
        this.details = details == null ? List.of() : details;
    }

    public static TemplateException badRequest(String message, String... details) {
        return new TemplateException(Kind.BAD_REQUEST, "BAD_REQUEST", message, List.of(details));
    }

    public static TemplateException badRequestWithCode(String code, String message, String... details) {
        return new TemplateException(Kind.BAD_REQUEST, code, message, List.of(details));
    }

    public static TemplateException notFound(String code, String message) {
        return new TemplateException(Kind.NOT_FOUND, code, message, List.of());
    }

    public static TemplateException forbidden(String message) {
        return new TemplateException(Kind.FORBIDDEN, "FORBIDDEN", message, List.of());
    }

    public static TemplateException forbiddenWithCode(String code, String message) {
        return new TemplateException(Kind.FORBIDDEN, code, message, List.of());
    }

    public Kind getKind() { return kind; }
    public String getCode() { return code; }
    public List<String> getDetails() { return details; }
}
