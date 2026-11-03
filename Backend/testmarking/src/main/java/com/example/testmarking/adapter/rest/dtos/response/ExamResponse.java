package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * An exam with the facts the pages need. result_policy: IMMEDIATE (ONLINE and the teacher kept the default) |
 * AFTER_TEACHER_PUBLISH (everything else: the teacher marks and publishes later).
 */
public record ExamResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("name") String name,
        @JsonProperty("subject") String subject,
        @JsonProperty("class_id") UUID classId,
        @JsonProperty("class_name") String className,
        @JsonProperty("format") String format,
        @JsonProperty("status") String status,
        @JsonProperty("from_time") OffsetDateTime fromTime,
        @JsonProperty("to_time") OffsetDateTime toTime,
        @JsonProperty("duration_minutes") Integer durationMinutes,
        @JsonProperty("max_score") BigDecimal maxScore,
        @JsonProperty("template_id") UUID templateId,
        @JsonProperty("template_name") String templateName,
        @JsonProperty("template_total_questions") Integer templateTotalQuestions,
        @JsonProperty("question_bank_id") UUID questionBankId,
        @JsonProperty("question_bank_name") String questionBankName,
        @JsonProperty("versions_count") int versionsCount,
        @JsonProperty("easy") int easy,
        @JsonProperty("medium") int medium,
        @JsonProperty("hard") int hard,
        @JsonProperty("questions_per_version") int questionsPerVersion,
        @JsonProperty("show_result_immediately") boolean showResultImmediately,
        @JsonProperty("result_policy") String resultPolicy,
        @JsonProperty("is_score_published") boolean isScorePublished,
        @JsonProperty("results_released") boolean resultsReleased,
        @JsonProperty("my_role") String myRole,
        @JsonProperty("created_at") OffsetDateTime createdAt
) {
}
