package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Everything the phone needs to run the exam without the network: the rules, the student's version and its questions. */
public record OnlinePaperResponse(
        @JsonProperty("exam_id") UUID examId,
        @JsonProperty("exam_name") String examName,
        @JsonProperty("subject") String subject,
        @JsonProperty("duration_minutes") int durationMinutes,
        @JsonProperty("allow_reference") boolean allowReference,
        /** FLAG | LOCK, only meaningful when allow_reference is false */
        @JsonProperty("leave_policy") String leavePolicy,
        @JsonProperty("from_time") OffsetDateTime fromTime,
        @JsonProperty("to_time") OffsetDateTime toTime,
        @JsonProperty("results_released") boolean resultsReleased,
        @JsonProperty("test_code") String testCode,
        @JsonProperty("attempt") AttemptStateResponse attempt,
        @JsonProperty("questions") List<PaperQuestionResponse> questions
) {
}
