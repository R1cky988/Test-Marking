package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;


/** Mark (violation = true, the default) or clear a student's violation. */
public record ViolationRequest(
        @JsonProperty("student_id") UUID studentId,
        @JsonProperty("violation") Boolean violation,
        @JsonProperty("reason") String reason
) {
}
