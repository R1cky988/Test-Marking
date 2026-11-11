package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;


/** One paper in the list: who, which version, how many right, the score; a violation is shown at the end. */
public record ExamResultRowResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("student_id") UUID studentId,
        @JsonProperty("student_code") String studentCode,
        @JsonProperty("full_name") String fullName,
        @JsonProperty("test_code") String testCode,
        @JsonProperty("total_correct") Integer totalCorrect,
        @JsonProperty("total_questions") Integer totalQuestions,
        @JsonProperty("total_score") BigDecimal totalScore,
        @JsonProperty("is_violation") boolean violation,
        @JsonProperty("violation_reason") String violationReason,
        @JsonProperty("has_image") boolean hasImage,
        @JsonProperty("source") String source,
        @JsonProperty("status") String status,
        @JsonProperty("submitted_at") OffsetDateTime submittedAt,
        /** when the system marked the paper */
        @JsonProperty("graded_at") OffsetDateTime gradedAt,
        /** ONLINE: when the phone's answers reached the server */
        @JsonProperty("synced_at") OffsetDateTime syncedAt,
        /** ONLINE: when the student handed in, by the phone's clock (differs from synced_at when he was offline) */
        @JsonProperty("client_submitted_at") OffsetDateTime clientSubmittedAt,
        /** ONLINE: he left the exam screen and the teacher chose "report only"; flag_decision tells what the teacher decided (null = not yet) */
        @JsonProperty("is_flagged") boolean flagged,
        @JsonProperty("flag_reason") String flagReason,
        @JsonProperty("flag_decision") String flagDecision,
        @JsonProperty("penalty_points") BigDecimal penaltyPoints
) {
}
