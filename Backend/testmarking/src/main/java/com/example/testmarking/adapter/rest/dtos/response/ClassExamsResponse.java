package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** Exams grouped for the tabs. draft is only sent to the teacher. */
public record ClassExamsResponse(
        @JsonProperty("upcoming") List<ExamItemResponse> upcoming,
        @JsonProperty("ongoing") List<ExamItemResponse> ongoing,
        @JsonProperty("ended") List<ExamItemResponse> ended,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("draft") List<ExamItemResponse> draft
) {
}
