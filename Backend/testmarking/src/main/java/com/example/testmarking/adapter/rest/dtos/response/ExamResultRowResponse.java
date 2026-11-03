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
        @JsonProperty("submitted_at") OffsetDateTime submittedAt
) {
}
