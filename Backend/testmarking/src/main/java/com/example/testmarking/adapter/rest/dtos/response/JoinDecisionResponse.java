package com.example.testmarking.adapter.rest.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

/** Result of approve / reject. */
public record JoinDecisionResponse(
        @JsonProperty("id") UUID id,
        @JsonProperty("status") String status
) {
}
