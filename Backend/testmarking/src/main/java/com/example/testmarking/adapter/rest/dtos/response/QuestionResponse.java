package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record QuestionResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("bank_id") UUID bankId,
        @JsonProperty("content") String content,
        @JsonProperty("explanation") String explanation,
        @JsonProperty("question_type") String questionType,
        @JsonProperty("options") List<QuestionOptionResponse> options,
        @JsonProperty("correct_answers") List<String> correctAnswers,
        @JsonProperty("difficulty") String difficulty,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("updated_at") OffsetDateTime updatedAt
) {
}
