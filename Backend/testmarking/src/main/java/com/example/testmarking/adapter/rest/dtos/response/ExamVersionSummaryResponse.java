package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** One version ("mã đề") in the list: its 3-digit code and how many questions it has. */
public record ExamVersionSummaryResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("code") String code,
        @JsonProperty("question_count") int questionCount,
        @JsonProperty("easy") int easy,
        @JsonProperty("medium") int medium,
        @JsonProperty("hard") int hard
) {
}
