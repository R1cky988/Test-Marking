package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;


/** Everybody of the class is a participant; has_result tells who handed a paper in. */
public record ExamParticipantResponse(
        @JsonProperty("student_id") UUID studentId,
        @JsonProperty("student_code") String studentCode,
        @JsonProperty("full_name") String fullName,
        @JsonProperty("email") String email,
        @JsonProperty("has_result") boolean hasResult,
        @JsonProperty("result_id") UUID resultId,
        @JsonProperty("total_score") BigDecimal totalScore,
        @JsonProperty("total_correct") Integer totalCorrect,
        @JsonProperty("is_violation") boolean violation,
        @JsonProperty("submitted_at") OffsetDateTime submittedAt,
        /** ONLINE: NOT_STARTED | IN_PROGRESS | LOCKED | SUBMITTED; null for the other formats */
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("attempt_status") String attemptStatus,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("left_count") Integer leftCount,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("synced_at") OffsetDateTime syncedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("graded_at") OffsetDateTime gradedAt,
        /** reported for leaving the exam screen; flag_decision null = the teacher has not decided yet */
        @JsonProperty("is_flagged") boolean flagged,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("flag_reason") String flagReason,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("flag_decision") String flagDecision,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("penalty_points") BigDecimal penaltyPoints
) {
}
