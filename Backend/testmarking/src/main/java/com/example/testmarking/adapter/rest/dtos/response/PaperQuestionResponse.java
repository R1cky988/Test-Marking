package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * One question of the student's paper. seconds is the time for this question when the exam is closed book (the questions go
 * forward only); null with open book (free time, any order).
 */
public record PaperQuestionResponse(
        @JsonProperty("order") int order,
        @JsonProperty("content") String content,
        @JsonProperty("type") String type,
        @JsonProperty("difficulty") String difficulty,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("seconds") Integer seconds,
        @JsonProperty("options") List<PaperOptionResponse> options
) {
}
