package com.example.testmarking.adapter.rest.dtos.request;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Body of POST /classes/join. */
public record JoinClassRequest(
        @JsonProperty("join_code") String joinCode,
        @JsonProperty("message") String message
) {
}
