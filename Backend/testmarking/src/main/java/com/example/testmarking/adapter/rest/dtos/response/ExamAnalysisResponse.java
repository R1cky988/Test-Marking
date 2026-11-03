package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;


public record ExamAnalysisResponse(
        @JsonProperty("total_papers") int totalPapers,
        @JsonProperty("test_codes") List<String> testCodes,
        @JsonProperty("questions") List<QuestionStatResponse> questions
) {
}
