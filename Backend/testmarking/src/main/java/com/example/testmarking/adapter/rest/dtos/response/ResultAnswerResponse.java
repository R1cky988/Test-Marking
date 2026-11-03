package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;


/** The student's choice for one question of the version, next to the right answer. */
public record ResultAnswerResponse(
        @JsonProperty("order") int order,
        @JsonProperty("choice") String choice,
        @JsonProperty("correct_answer") String correctAnswer,
        @JsonProperty("is_correct") boolean correct
) {
}
