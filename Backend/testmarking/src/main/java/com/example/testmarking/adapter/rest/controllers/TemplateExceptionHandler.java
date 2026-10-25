package com.example.testmarking.adapter.rest.controllers;

import com.example.testmarking.template.exception.TemplateException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

/** Same error envelope as NestJS: { "error": { "code", "message", "details": [] } }. */
@RestControllerAdvice(assignableTypes = TestLayoutController.class)
public class TemplateExceptionHandler {

    @ExceptionHandler(TemplateException.class)
    public ResponseEntity<Map<String, Object>> handle(TemplateException e) {
        HttpStatus status = switch (e.getKind()) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case FORBIDDEN -> FORBIDDEN;
            case BAD_REQUEST -> HttpStatus.BAD_REQUEST;
        };
        List<String> details = e.getDetails();
        return ResponseEntity.status(status)
                .body(Map.of("error", Map.of("code", e.getCode(), "message", e.getMessage(), "details", details)));
    }
}
