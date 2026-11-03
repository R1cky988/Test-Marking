package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;


/** How one question of the bank was answered, over every version it appeared in. percent = share of the papers that had it. */
public record QuestionStatResponse(
        @JsonProperty("question_id") UUID questionId,
        @JsonProperty("content") String content,
        @JsonProperty("difficulty") String difficulty,
        @JsonProperty("question_type") String questionType,
        @JsonProperty("test_codes") List<String> testCodes,
        @JsonProperty("appeared") int appeared,
        @JsonProperty("blank_count") int blankCount,
        @JsonProperty("blank_percent") double blankPercent,
        @JsonProperty("correct_count") int correctCount,
        @JsonProperty("correct_percent") double correctPercent,
        @JsonProperty("options") List<OptionStatResponse> options
) {
}
