package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Create / update an exam (only while it is a DRAFT).
 * format: OFFLINE | ONLINE | SUBMIT. template_id is required for OFFLINE and SUBMIT (paper sheet), optional for ONLINE.
 * show_result_immediately is only read for ONLINE. When it is missing: true for an open-book exam (allow_reference), false otherwise
 * (a closed-book exam keeps its results hidden until the teacher publishes them); the other formats never show the result at once.
 * allow_reference is only read for ONLINE (default false): true = the student may leave the exam screen to look things up,
 * so leaving it is not a violation.
 * leave_policy is only read for ONLINE without open book (default FLAG). Leaving the screen is a violation (0 points) either way:
 * FLAG = the student may go on, LOCK = the exam also locks until the teacher unlocks it (the violation stays).
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
        @JsonProperty("show_result_immediately") Boolean showResultImmediately,
        @JsonProperty("allow_reference") Boolean allowReference,
        @JsonProperty("leave_policy") String leavePolicy,
        @JsonProperty("max_retakes") Integer maxRetakes
) {
    /** Without the leave policy (it stays FLAG). */
    public ExamRequest(String name, String subject, UUID classId, String format, OffsetDateTime fromTime, OffsetDateTime toTime,
                       Integer durationMinutes, BigDecimal maxScore, UUID templateId, UUID questionBankId, Boolean showResultImmediately,
                       Boolean allowReference) {
        this(name, subject, classId, format, fromTime, toTime, durationMinutes, maxScore, templateId, questionBankId, showResultImmediately, allowReference, null, null);
    }

    /** Without the open-book switch (it stays off). */
    public ExamRequest(String name, String subject, UUID classId, String format, OffsetDateTime fromTime, OffsetDateTime toTime,
                       Integer durationMinutes, BigDecimal maxScore, UUID templateId, UUID questionBankId, Boolean showResultImmediately) {
        this(name, subject, classId, format, fromTime, toTime, durationMinutes, maxScore, templateId, questionBankId, showResultImmediately, null, null, null);
    }
}
