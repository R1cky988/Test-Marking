package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.UUID;

/** A question as it is printed on one version: order = its number on the paper. */
public record ExamVersionQuestionResponse(
        @JsonProperty("order") int order,
        @JsonProperty("question_id") UUID questionId,
        @JsonProperty("content") String content,
        @JsonProperty("question_type") String questionType,
        @JsonProperty("difficulty") String difficulty,
        @JsonProperty("options") List<QuestionOptionResponse> options,
        @JsonProperty("correct_answers") List<String> correctAnswers
) {
}
