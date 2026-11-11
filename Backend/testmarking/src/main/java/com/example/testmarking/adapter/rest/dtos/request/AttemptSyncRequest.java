package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * What the phone sends to the server. It is the same call for a heartbeat, for the progress saved before the network came
 * back, and for the final answers: everything is cumulative, so a retry changes nothing.
 *
 *  answers: all answers so far ({order, choice}); left_count: how many times the student left the exam screen so far;
 *  finished: true when he handed in (or time ran out); client_finished_at: that moment on the phone's clock.
 */
public record AttemptSyncRequest(
        @JsonProperty("answers") List<ResultAnswerRequest> answers,
        @JsonProperty("current_index") Integer currentIndex,
        @JsonProperty("left_count") Integer leftCount,
        @JsonProperty("finished") Boolean finished,
        @JsonProperty("client_finished_at") OffsetDateTime clientFinishedAt
) {
}
