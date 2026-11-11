package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

/** The teacher decides a paper that was reported for leaving the exam screen: ZERO (0 points), DEDUCT (minus penalty_points) or DISMISS. */
public record FlagDecisionRequest(
        @JsonProperty("student_id") UUID studentId,
        @JsonProperty("decision") String decision,
        @JsonProperty("penalty_points") BigDecimal penaltyPoints
) {
}
