package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import com.example.testmarking.adapter.rest.dtos.request.ResultAnswerRequest;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Where a student's attempt stands. status: IN_PROGRESS | LOCKED | SUBMITTED. server_now lets the phone correct its clock
 * (deadline_at - server_now is the time that is really left).
 */
public record AttemptStateResponse(
        @JsonProperty("status") String status,
        @JsonProperty("started_at") OffsetDateTime startedAt,
        @JsonProperty("deadline_at") OffsetDateTime deadlineAt,
        @JsonProperty("server_now") OffsetDateTime serverNow,
        @JsonProperty("left_count") int leftCount,
        @JsonProperty("current_index") int currentIndex,
        @JsonInclude(JsonInclude.Include.NON_NULL) @JsonProperty("lock_reason") String lockReason,
        @JsonProperty("answers") List<ResultAnswerRequest> answers
) {
}
