package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Create / update an exam (only while it is a DRAFT).
 * format: OFFLINE | ONLINE | SUBMIT. template_id is required for OFFLINE and SUBMIT (paper sheet), optional for ONLINE.
 * show_result_immediately is only read for ONLINE (default true); the other formats never show the result at once.
 */
public record ExamRequest(
        @JsonProperty("name") String name,
        @JsonProperty("subject") String subject,
        @JsonProperty("class_id") UUID classId,
        @JsonProperty("format") String format,
        @JsonProperty("from_time") OffsetDateTime fromTime,
        @JsonProperty("to_time") OffsetDateTime toTime,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonProperty("max_score") BigDecimal maxScore,
        @JsonProperty("template_id") UUID templateId,
        @JsonProperty("question_bank_id") UUID questionBankId,
        @JsonProperty("show_result_immediately") Boolean showResultImmediately
) {
}
