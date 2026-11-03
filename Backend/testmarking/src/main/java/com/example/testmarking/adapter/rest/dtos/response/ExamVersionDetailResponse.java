package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;

public record ExamVersionDetailResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("code") String code,
        @JsonProperty("questions") List<ExamVersionQuestionResponse> questions
) {
}
