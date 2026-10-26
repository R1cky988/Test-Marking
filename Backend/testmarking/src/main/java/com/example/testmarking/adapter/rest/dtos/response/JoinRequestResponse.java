package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/** One join request (teacher view). */
public record JoinRequestResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("student") JoinRequestStudentResponse student,
        @JsonProperty("message") String message,
        @JsonProperty("status") String status,
        @JsonProperty("rejection_reason") String rejectionReason,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("processed_at") OffsetDateTime processedAt
) {
}
