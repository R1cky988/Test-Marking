package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;


public record ExamResultDetailResponse(
        @JsonProperty("result") ExamResultRowResponse result,
        @JsonProperty("max_score") BigDecimal maxScore,
        @JsonProperty("answers") List<ResultAnswerResponse> answers
) {
}
