package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record QuestionOptionResponse(
        @JsonProperty("label") String label,
        @JsonProperty("content") String content,
        @JsonProperty("is_correct") boolean isCorrect
) {
}
