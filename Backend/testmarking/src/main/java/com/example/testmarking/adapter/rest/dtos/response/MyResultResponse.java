package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;


/** What a student sees of his own paper. result is only sent once the result is released (published, or ONLINE with immediate result). */
public record MyResultResponse(
        @JsonProperty("released") boolean released,
        @JsonProperty("submitted") boolean submitted,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("detail") ExamResultDetailResponse detail,
        /** the paper was reported for leaving the exam screen and the teacher has not decided yet: the score is held back */
        @JsonProperty("pending_review") boolean pendingReview
) {
    public MyResultResponse(boolean released, boolean submitted, ExamResultDetailResponse detail) {
        this(released, submitted, detail, false);
    }
}
